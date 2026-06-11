import { NextResponse } from "next/server";
import Stripe from "stripe";
import documentsClient from "@/lib/appDocumentsClient";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { ReferralRewardRepository } from "@/repositories/referral-reward.repo";
import { ReferralRepository } from "@/repositories/referral.repo";
import { ReferralInvitationRepository } from "@/repositories/referral-invitation.repo";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { ActivityLogger } from "@/lib/userActivity";
import { isPricingAbLayout } from "@/lib/pricingAbTest";
import { isHomeAbExperimentVariant } from "@/lib/homeAbTest";
import { isPricingModelAbVariant } from "@/lib/pricingModelAbTest";
import { getAccessTierKey } from "@/lib/pricing";
import { normalizePlan } from "@/lib/subscriptionAccess";
import { toSerializedPlan } from "@/lib/planSerialization";
import type { Plan } from "@/models/plans.model";
import { logger, captureException, trackAPICall } from "@/lib/sentry-logger";
import { findOrCreateWebUserByEmail } from "@/lib/guestCheckoutAuth";
import { persistStripeCustomerIdForUser } from "@/lib/resolveStripeCustomerId";
import {
  resolveUserProfileFromStripe,
  grantPlusPlan,
  revokePlusPlan,
  upsertStripeSubscription,
} from "@/lib/auth/supabase-user-admin";
import { recordPartnerCommissionForSubscriber } from "@/lib/partner/recordPartnerCommissionForSubscriber";
import {
  matchUsersCollectionByWebUserIds,
  usersCollectionEmailSetFromAuthUser,
  usersCollectionSetOnInsertFromAuthUser,
} from "@/lib/users/userDocumentIdentity";
import {
  sendGa4Events,
} from "@/lib/ga4MeasurementProtocol";
import {
  buildChargeAttributionMetadata,
  resolvePaymentIntentId,
  stampPaymentIntentAttribution,
} from "@/lib/stripeChargeAttribution";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Stripe `MetadataParam` allows string | number | null — not `undefined`. */
function toStripeMetadataParam(
  record: Record<string, string | number | null | undefined>
): Stripe.MetadataParam {
  const out: Stripe.MetadataParam = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

/** Billing period end moved to subscription items in current Stripe API typings. */
function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  return end != null ? end : null;
}

function serializeWebhookError(error: unknown): {
  message: string;
  stack?: string;
  name?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

function subscriptionCustomerId(subscription: Stripe.Subscription): string | null {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : (subscription.customer as { id?: string } | null)?.id ?? null;
}

function priceIdFromSubscription(subscription: Stripe.Subscription): string | null {
  const priceRaw = subscription.items?.data?.[0]?.price;
  if (typeof priceRaw === "string") return priceRaw;
  if (priceRaw && typeof priceRaw === "object" && "id" in priceRaw) {
    return (priceRaw as Stripe.Price).id;
  }
  return null;
}

async function ensureSubscriptionPriceId(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromEvent = priceIdFromSubscription(subscription);
  if (fromEvent) return fromEvent;

  try {
    const fresh = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ["items.data.price"],
    });
    return priceIdFromSubscription(fresh);
  } catch (err) {
    logger.warn("subscription.updated: failed to retrieve subscription for price id", {
      component: "stripe_webhook",
      action: "subscription_price_retrieve_failed",
      metadata: {
        subscriptionId: subscription.id,
        ...serializeWebhookError(err),
      },
    });
    return null;
  }
}

async function resolvePlusPlanFromStripePrice(
  priceId: string,
  metadata: Stripe.Metadata,
): Promise<{ plan: string; planType?: string } | null> {
  const db = documentsClient.db();
  const planDoc = await db.collection("plans").findOne({
    isActive: true,
    stripePriceId: priceId,
  });

  let plan: string | null = null;
  let planType: string | undefined;

  if (planDoc) {
    const planEntity = planDoc as unknown as Plan;
    const serialized = toSerializedPlan(planEntity);
    const tier = getAccessTierKey(serialized);
    planType = planEntity.title;
    if (tier === "premiumPlus" || tier === "premium") plan = "plus";
  }

  if (
    !plan &&
    typeof metadata.plan_name === "string" &&
    metadata.plan_name.trim()
  ) {
    planType = metadata.plan_name;
    plan = "plus";
  }

  if (!plan) return null;
  return { plan, planType: planType ?? metadata.plan_name };
}

function subscriptionUpdatedLogContext(
  subscription: Stripe.Subscription,
  userId: string,
  priceId?: string | null,
) {
  return {
    subscriptionId: subscription.id,
    customerId: subscriptionCustomerId(subscription),
    userId,
    priceId: priceId ?? null,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

function appendUniqueString(list: unknown, value: string): string[] {
  const base = Array.isArray(list)
    ? list.filter((item): item is string => typeof item === "string")
    : [];
  if (base.includes(value)) {
    return base;
  }
  return [...base, value];
}

function readMetadataValue(
  metadata: Record<string, string | undefined> | null | undefined,
  key: string
): string | null {
  const value = metadata?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Match browser-side `inferAttributionSource` in `analytics.ts` so GA4 Default Channel
 * Group / Primary Channel Group recognize `source` + `medium` on MP hits.
 * Values like `google_ads` + empty medium stay "Unassigned".
 */
function inferAttributionSource(
  metadata: Record<string, string | undefined> | null | undefined
): string {
  const utmSource = readMetadataValue(metadata, "utm_source");
  if (utmSource) return utmSource;

  const gclid = readMetadataValue(metadata, "gclid");
  const gbraid = readMetadataValue(metadata, "gbraid");
  const wbraid = readMetadataValue(metadata, "wbraid");
  if (gclid || gbraid || wbraid) return "google";
  if (readMetadataValue(metadata, "msclkid")) return "bing";
  if (readMetadataValue(metadata, "fbclid")) return "facebook";
  if (readMetadataValue(metadata, "ttclid")) return "tiktok";
  if (readMetadataValue(metadata, "referrer")) return "referral";
  return "(direct)";
}

function inferAttributionMedium(
  metadata: Record<string, string | undefined> | null | undefined
): string {
  const utmMedium = readMetadataValue(metadata, "utm_medium");
  if (utmMedium) return utmMedium;

  const gclid = readMetadataValue(metadata, "gclid");
  const gbraid = readMetadataValue(metadata, "gbraid");
  const wbraid = readMetadataValue(metadata, "wbraid");
  const msclkid = readMetadataValue(metadata, "msclkid");
  const fbclid = readMetadataValue(metadata, "fbclid");
  const ttclid = readMetadataValue(metadata, "ttclid");
  if (gclid || gbraid || wbraid || msclkid || fbclid || ttclid) return "cpc";
  if (readMetadataValue(metadata, "referrer")) return "referral";
  return "(none)";
}

function buildStripeGaClientId(args: {
  metadata?: Record<string, string | undefined> | null;
  customerId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  subscriptionId?: string | null;
}): string {
  const ga4ClientId = readMetadataValue(args.metadata ?? undefined, "ga4_client_id");
  if (ga4ClientId) return ga4ClientId;

  const metadataSessionId = readMetadataValue(
    args.metadata ?? undefined,
    "attribution_session_id"
  );
  return (
    metadataSessionId ||
    args.sessionId ||
    args.customerId ||
    args.subscriptionId ||
    args.userId ||
    "stripe_unknown_client"
  );
}

function readGa4SessionIdForMp(
  metadata: Record<string, string | undefined> | null | undefined
): string | undefined {
  const v = readMetadataValue(metadata, "ga4_session_id");
  return v ?? undefined;
}

function buildStripeGaAttributionParams(
  metadata: Record<string, string | undefined> | null | undefined
): Record<string, string> {
  const gclid = readMetadataValue(metadata, "gclid") || "";
  const gbraid = readMetadataValue(metadata, "gbraid") || "";
  const wbraid = readMetadataValue(metadata, "wbraid") || "";
  const fbclid = readMetadataValue(metadata, "fbclid") || "";
  const msclkid = readMetadataValue(metadata, "msclkid") || "";
  const ttclid = readMetadataValue(metadata, "ttclid") || "";
  const utmCampaignRaw = readMetadataValue(metadata, "utm_campaign");
  const googleAdsCampaignId = readMetadataValue(metadata, "google_ads_campaign_id");
  const attributionCampaign = readMetadataValue(metadata, "attribution_campaign");
  const effectiveCampaign =
    (utmCampaignRaw && utmCampaignRaw !== "(not set)" ? utmCampaignRaw : null) ||
    (attributionCampaign && attributionCampaign !== "(not set)" ? attributionCampaign : null) ||
    googleAdsCampaignId ||
    utmCampaignRaw ||
    "";
  return {
    source: inferAttributionSource(metadata),
    medium: inferAttributionMedium(metadata),
    campaign: effectiveCampaign,
    utm_source: readMetadataValue(metadata, "utm_source") || "",
    utm_medium: readMetadataValue(metadata, "utm_medium") || "",
    utm_campaign: effectiveCampaign,
    utm_content: readMetadataValue(metadata, "utm_content") || "",
    utm_term: readMetadataValue(metadata, "utm_term") || "",
    // Keep raw IDs for internal parity, but register GA4 custom dimensions on attribution_* aliases.
    gclid,
    gbraid,
    wbraid,
    fbclid,
    msclkid,
    ttclid,
    attribution_gclid: gclid,
    attribution_gbraid: gbraid,
    attribution_wbraid: wbraid,
    attribution_fbclid: fbclid,
    attribution_msclkid: msclkid,
    attribution_ttclid: ttclid,
    attribution_session_id:
      readMetadataValue(metadata, "attribution_session_id") || "",
    purchase_page: readMetadataValue(metadata, "purchase_page") || "",
    entry_page: readMetadataValue(metadata, "entry_page") || "",
  };
}

async function updateUserPublicMetadata(
  userId: string,
  newFields: Record<string, any>
) {
  try {
    const authAdmin = await appUserAdmin();
    const user = await authAdmin.users.getUser(userId);
    const currentMetadata = user.publicMetadata || {};
    const updatedMetadata = { ...currentMetadata, ...newFields };

    // Patch only `newFields` into Auth — passing the full merged metadata can
    // race with concurrent webhook updates and overwrite `app_metadata.plan`.
    await authAdmin.users.updateUserMetadata(userId, {
      publicMetadata: newFields,
      allowPlanDowngrade: normalizePlan(newFields.plan as string) === "free",
    });
    logger.info("Successfully updated metadata for user", {
      component: "stripe_webhook",
      action: "update_user_metadata",
      userId,
      metadata: { fields: Object.keys(newFields) },
    });

    // Sync to `users` collection
    try {
      const db = await documentsClient.db();
      const usersCollection = db.collection("users");

      const updateDoc: any = {
        publicMetadata: updatedMetadata,
        updatedAt: new Date()
      };

      if (newFields.plan) updateDoc.plan = newFields.plan;
      if (newFields.planType) updateDoc.planType = newFields.planType;
      if (newFields.purchaseAmount) updateDoc.purchaseAmount = newFields.purchaseAmount;
      if (newFields.purchaseCurrency) updateDoc.purchaseCurrency = newFields.purchaseCurrency;
      if (newFields.totalSpend) updateDoc.totalSpend = newFields.totalSpend;
      if (typeof updatedMetadata.partnerId === "string") {
        updateDoc.partnerId = updatedMetadata.partnerId;
      }
      if (typeof updatedMetadata.partnerReferralCode === "string") {
        updateDoc.partnerReferralCode = updatedMetadata.partnerReferralCode;
      }
      if (typeof updatedMetadata.partnerAttributedAt === "string") {
        updateDoc.partnerAttributedAt = updatedMetadata.partnerAttributedAt;
      }
      if (typeof updatedMetadata.partnerReferralPromotionId === "string") {
        updateDoc.partnerReferralPromotionId =
          updatedMetadata.partnerReferralPromotionId;
      }
      if (typeof updatedMetadata.partnerStripeDiscountCode === "string") {
        updateDoc.partnerStripeDiscountCode =
          updatedMetadata.partnerStripeDiscountCode;
      }
      if (typeof updatedMetadata.partnerRefereeDiscountPercent === "number") {
        updateDoc.partnerRefereeDiscountPercent =
          updatedMetadata.partnerRefereeDiscountPercent;
      }
      if (typeof updatedMetadata.partnerCommissionPercent === "number") {
        updateDoc.partnerCommissionPercent =
          updatedMetadata.partnerCommissionPercent;
      }
      if (typeof updatedMetadata.partnerReferralDiscountActive === "boolean") {
        updateDoc.partnerReferralDiscountActive =
          updatedMetadata.partnerReferralDiscountActive;
      }
      if (typeof updatedMetadata.partnerReferralDiscountUsed === "boolean") {
        updateDoc.partnerReferralDiscountUsed =
          updatedMetadata.partnerReferralDiscountUsed;
      }
      if (typeof updatedMetadata.partnerReferralDiscountExpiry === "string") {
        updateDoc.partnerReferralDiscountExpiry =
          updatedMetadata.partnerReferralDiscountExpiry;
      }
      if (newFields.hasEverPurchased !== undefined) {
        updateDoc.hasEverPurchased = newFields.hasEverPurchased;
      }

      Object.assign(updateDoc, usersCollectionEmailSetFromAuthUser(user));

      await usersCollection.updateOne(
        matchUsersCollectionByWebUserIds(userId),
        {
          $set: updateDoc,
          $setOnInsert: usersCollectionSetOnInsertFromAuthUser(userId, user),
        },
        { upsert: true } // Upsert just in case, though user should exist
      );

      await recordPartnerCommissionForSubscriber(userId);
    } catch (dbErr) {
      logger.error(" Failed to sync metadata to user document store", {
        component: "stripe_webhook",
        action: "sync_metadata_failed",
        userId,
        metadata: { error: dbErr },
      });
    }

  } catch (error) {
    captureException(error, {
      component: "stripe_webhook",
      action: "update_metadata_error",
      userId,
    });
  }
}

async function handleReferralRewards(
  session: Stripe.Checkout.Session,
  metadata: any
) {
  try {
    const authAdmin = await appUserAdmin();
    const metaUserId = metadata?.user_id as string | undefined;
    let userIdToUse: string | undefined = metaUserId;

    let user;
    let userMetadata: any = {};

    try {
      if (userIdToUse) {
        user = await authAdmin.users.getUser(userIdToUse);
      } else {
        throw new Error("No user_id in metadata");
      }
      userMetadata = user.publicMetadata as any;
      // 🚧 Guard: if referral already consumed or inactive, skip rewarding
      if (
        userMetadata?.referralActive === false ||
        userMetadata?.referralDiscountActive === false ||
        userMetadata?.referralDiscountUsed === true ||
        userMetadata?.referralCodeUsed === true
      ) {
        return;
      }
    } catch (error) {
      const inviteeEmail =
        (session as any)?.customer_details?.email ||
        (session as any)?.customer_email;
      if (inviteeEmail) {
        try {
          const users = await authAdmin.users.getUserList({
            emailAddress: [String(inviteeEmail).trim().toLowerCase()],
          });
          if (users?.data?.length) {
            user = users.data[0];
            userIdToUse = user.id;
            userMetadata = user.publicMetadata as any;
            // 🚧 Guard: if referral already consumed or inactive, skip rewarding
            if (
              userMetadata?.referralActive === false ||
              userMetadata?.referralDiscountActive === false ||
              userMetadata?.referralDiscountUsed === true ||
              userMetadata?.referralCodeUsed === true
            ) {
              return;
            }
          } else {
            console.warn(`❌ No auth user found by email ${inviteeEmail}`);
            return;
          }
        } catch (err) {
          console.error("Error resolving user by email:", err);
          return;
        }
      } else {
        return;
      }
    }

    const referralCode = userMetadata?.referralCode || metadata?.referral_code;

    if (!referralCode) {
      return;
    }

    // Find the referrer
    const referralRepo = new ReferralRepository(documentsClient);
    await referralRepo.ensureIndexes();

    const referrer = await referralRepo.findOneByCode(referralCode);

    if (!referrer) {
      return;
    }

    // Calculate reward amount (20% of purchase)
    const amountTotal = session.amount_total || 0;
    const rewardAmount = (amountTotal / 100) * 0.2; // Convert from cents and apply 20%

    if (rewardAmount < 0.01) {
      return;
    }

    const rewardRepo = new ReferralRewardRepository(documentsClient);
    await rewardRepo.ensureIndexes();

    try {
      await rewardRepo.createReward({
        inviterId: referrer.userId,
        inviteeId: userIdToUse as string,
        referralCode,
        amount: rewardAmount,
        status: "confirmed",
        checkoutId: session.id,
        planPurchased: metadata.plan_name || "plus",
        purchaseAmount: amountTotal / 100,
        purchaseDate: new Date(),
      });

      // Update referrer's metadata with reward information
      const referrerUser = await authAdmin.users.getUser(referrer.userId);
      const currentMetadata = referrerUser.publicMetadata || {};
      const currentTotalRewards = (currentMetadata as any)?.totalRewards || 0;
      const newTotalRewards = currentTotalRewards + rewardAmount;

      const invitationRepo = new ReferralInvitationRepository(documentsClient);
      await invitationRepo.ensureIndexes();

      const invitation = await invitationRepo.findInvitationByCodeAndInvitee(
        referralCode,
        userIdToUse as string
      );
      if (invitation) {
        await invitationRepo.updateInvitationStatus(
          invitation._id!.toString(),
          "completed"
        );
      }

      const totalInvitees = await invitationRepo.getTotalInvitations(
        referrer.userId
      );
      const totalSuccessfulPurchases = await rewardRepo.getInviteeCount(
        referrer.userId
      );
      let rewardLevel = 1;
      if (totalSuccessfulPurchases >= 10) rewardLevel = 3;
      else if (totalSuccessfulPurchases >= 5) rewardLevel = 2;

      await authAdmin.users.updateUserMetadata(referrer.userId, {
        publicMetadata: {
          ...currentMetadata,
          hasPendingRewards: true,
          lastReferralDate: new Date().toISOString(),
          totalRewards: newTotalRewards,
          totalInvitees: totalInvitees,
          rewardLevel: rewardLevel,
          lastRewardAmount: rewardAmount,
          lastRewardDate: new Date().toISOString(),
        },
      });
    } catch (dbError) {
      console.error(`❌ Failed to create referral reward:`, dbError);
      throw dbError; // Re-throw to be caught by outer try-catch
    }

    try {
      const freshUser = await authAdmin.users.getUser(userIdToUse as string);
      const freshMeta = freshUser.publicMetadata as any;
      const promotionCodeId =
        freshMeta?.referralPromotionId || freshMeta?.promotionCodeId;

      try {
        // Determine if this was a referral discount or NEW discount
        const isReferralDiscount = freshMeta?.referralPromotionId;
        const isNewDiscount =
          freshMeta?.promotionCodeId && !freshMeta?.referralPromotionId;

        const updateData: any = {
          ...freshMeta,
          // Clear all discount identifiers to avoid accidental future matches
          referralCode: null,
          referralPromotionId: null,
          promotionCodeId: null,
          couponId: null,
          couponCode: null,
        };

        if (isReferralDiscount) {
          // This was a referral discount
          updateData.referralDiscountUsed = true;
          updateData.referralDiscountUsedAt = new Date().toISOString();
          updateData.referralDiscountActive = false;
          updateData.referralActive = false;
          updateData.referralCodeUsed = true;
        } else if (isNewDiscount) {
          // This was a NEW discount
          updateData.newDiscountUsed = true;
          updateData.newDiscountUsedAt = new Date().toISOString();
        }

        await authAdmin.users.updateUserMetadata(userIdToUse as string, {
          publicMetadata: updateData,
        });
      } catch (error) {
      }

      if (promotionCodeId) {
        try {
          await stripe.promotionCodes.update(promotionCodeId, {
            active: false,
          });
        } catch (error) {
          console.error(
            "Error deactivating promotion code:",
            promotionCodeId,
            error
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to refresh invitee metadata before deactivating promotion code:",
        err
      );
    }
  } catch (error) {
    console.error("Error handling referral rewards:", error);
  }
}

export async function POST(req: Request) {
  try {
    // Read the raw request body as bytes (do NOT use req.json() / req.text() here)
    const rawBody = await req.arrayBuffer();
    const payload = Buffer.from(rawBody);
    const sig = req.headers.get("stripe-signature");
    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        logger.error("STRIPE_WEBHOOK_SECRET not found in environment", {
          component: "stripe_webhook",
          action: "webhook_secret_missing",
        });
        return NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 500 }
        );
      }

      if (!sig) {
        logger.error("Missing stripe-signature header", {
          component: "stripe_webhook",
          action: "missing_signature",
        });
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 400 }
        );
      }

      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err) {
      captureException(err, {
        component: "stripe_webhook",
        action: "signature_verification_failed",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const authAdmin = await appUserAdmin();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      let metadata: Record<string, string | undefined> = {
        ...(session.metadata as Record<string, string | undefined>),
      };
      let subscriptionMetadata = metadata;

      if (metadata.guest_checkout === "true") {
        const payEmail =
          session.customer_details?.email?.trim().toLowerCase() ||
          (typeof session.customer_email === "string"
            ? session.customer_email.trim().toLowerCase()
            : undefined);
        if (!payEmail) {
          logger.error("Guest checkout completed without email", {
            component: "stripe_webhook",
            action: "guest_checkout_missing_email",
            metadata: { sessionId: session.id },
          });
          return NextResponse.json({ received: true });
        }
        try {
          const userId = await findOrCreateWebUserByEmail(payEmail);
          metadata = { ...metadata, user_id: userId };
          subscriptionMetadata = metadata;
          if (session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            await stripe.subscriptions.update(session.subscription as string, {
              metadata: {
                ...sub.metadata,
                user_id: userId,
                checkout_id: session.id,
              },
            });
          }
        } catch (guestErr) {
          captureException(guestErr, {
            component: "stripe_webhook",
            action: "guest_checkout_provision_user",
            metadata: { sessionId: session.id },
          });
          return NextResponse.json({ received: true });
        }
      }

      logger.info("Processing checkout.session.completed event", {
        component: "stripe_webhook",
        action: "checkout_completed",
        metadata: {
          sessionId: session.id,
          metadata,
        },
      });

      const checkoutPaymentIntentId = resolvePaymentIntentId(session.payment_intent);
      if (checkoutPaymentIntentId) {
        try {
          await stampPaymentIntentAttribution(
            checkoutPaymentIntentId,
            buildChargeAttributionMetadata(metadata),
            { checkout_session_id: session.id }
          );
        } catch (stampErr) {
          logger.warn("Failed to stamp charge attribution on checkout payment", {
            component: "stripe_webhook",
            action: "stamp_checkout_charge_attribution",
            metadata: {
              sessionId: session.id,
              paymentIntentId: checkoutPaymentIntentId,
              error: stampErr,
            },
          });
        }
      }

      if (
        metadata?.user_id &&
        typeof session.customer === "string" &&
        session.customer
      ) {
        await persistStripeCustomerIdForUser(metadata.user_id, session.customer);
      }

      // Supabase direct sync: grant plus plan (skip mock-exam one-time purchases)
      if (metadata?.user_id && metadata.purchase_type !== "mock_exam") {
        try {
          const sbProfile = await resolveUserProfileFromStripe(
            typeof session.customer === "string" ? session.customer : null,
            metadata.user_id,
            session.customer_details?.email,
          );
          if (sbProfile) {
            await grantPlusPlan(sbProfile.supabaseAuthUserId, sbProfile.profileId);
          }
        } catch (sbErr) {
          logger.error("checkout.completed: Supabase plan grant failed", {
            component: "stripe_webhook",
            action: "supabase_grant_plan_error",
            metadata: { error: sbErr },
          });
        }
      }

      if (metadata?.user_id) {
        // Get user metadata to check for any existing discounts
        const user = await authAdmin.users.getUser(metadata.user_id);
        const userMetadata = user.publicMetadata as any;
        const isMockExamPurchase = metadata.purchase_type === "mock_exam";
        const purchasedMockExamId = metadata.mock_exam_id;

        // Check if user has any discount fields that need to be cleared (subscription path)
        const hasDiscountFields =
          userMetadata?.referralCode ||
          userMetadata?.referralPromotionId ||
          userMetadata?.promotionCodeId ||
          userMetadata?.couponId ||
          userMetadata?.couponCode ||
          userMetadata?.partnerReferralPromotionId;

        const partnerPromoToDeactivate =
          typeof userMetadata?.partnerReferralPromotionId === "string"
            ? userMetadata.partnerReferralPromotionId
            : null;

        if (isMockExamPurchase && purchasedMockExamId) {
          await updateUserPublicMetadata(metadata.user_id, {
            planCancelled: false,
            hasEverPurchased: true,
            purchaseDate: new Date().toISOString(),
            purchaseAmount: (session.amount_total || 0) / 100,
            purchaseCurrency: (session.currency || "cad").toUpperCase(),
            totalSpend:
              ((userMetadata.totalSpend as number) || 0) +
              ((session.amount_total || 0) / 100),
            purchasedMockExamIds: appendUniqueString(
              userMetadata.purchasedMockExamIds,
              purchasedMockExamId
            ),
            lastMockExamPurchaseId: purchasedMockExamId,
            lastMockExamPurchaseAt: new Date().toISOString(),
          });
        } else if (hasDiscountFields) {
          // Clear all discount fields after any successful purchase
          await updateUserPublicMetadata(metadata.user_id, {
            planCancelled: false,
            // Clear all discount identifiers to prevent future discounts
            referralCode: null,
            referralPromotionId: null,
            promotionCodeId: null,
            couponId: null,
            couponCode: null,
            partnerReferralPromotionId: null,
            partnerStripeDiscountCode: null,
            partnerReferralDiscountActive: false,
            partnerReferralDiscountUsed: true,
            // Mark that user has made a purchase (no more discounts)
            hasEverPurchased: true,
            purchaseDate: new Date().toISOString(),
            plan: "plus",
            planType: metadata.plan_name,
            purchaseAmount: (session.amount_total || 0) / 100,
            purchaseCurrency: (session.currency || "cad").toUpperCase(),
            totalSpend: ((userMetadata.totalSpend as number) || 0) + ((session.amount_total || 0) / 100)
          });
          if (partnerPromoToDeactivate) {
            try {
              await stripe.promotionCodes.update(partnerPromoToDeactivate, {
                active: false,
              });
            } catch (promoErr) {
              console.error(
                "Error deactivating partner referee promotion:",
                partnerPromoToDeactivate,
                promoErr
              );
            }
          }
          logger.info(
            "Cleared all discount fields for user after purchase",
            {
              component: "stripe_webhook",
              action: "clear_discount_fields",
              userId: metadata.user_id,
            }
          );
        } else {
          await updateUserPublicMetadata(metadata.user_id, {
            planCancelled: false,
            planExpiresAt: null,
            hasEverPurchased: true,
            purchaseDate: new Date().toISOString(),
            plan: "plus",
            planType: metadata.plan_name,
            purchaseAmount: (session.amount_total || 0) / 100,
            purchaseCurrency: (session.currency || "cad").toUpperCase(),
            totalSpend: ((userMetadata.totalSpend as number) || 0) + ((session.amount_total || 0) / 100)
          });
        }
      }

      if (session.subscription && metadata?.user_id) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        subscriptionMetadata = {
          ...subscription.metadata,
          user_id: metadata.user_id,
          checkout_id: session.id,
        };

        if (subscription.status !== "canceled") {
          await stripe.subscriptions.update(session.subscription as string, {
            metadata: toStripeMetadataParam(subscriptionMetadata),
          });
        } else {
          console.warn(
            `Cannot update metadata: subscription ${subscription.id} is canceled.`
          );
        }

        const periodEnd = subscriptionCurrentPeriodEndUnix(subscription);
        if (periodEnd) {
          await updateUserPublicMetadata(metadata.user_id, {
            planRenewsAt: new Date(periodEnd * 1000).toISOString(),
            planExpiresAt: null,
          });
        }

        // Sync subscription row to Supabase PG
        if (typeof session.customer === "string") {
          await upsertStripeSubscription(subscription, session.customer).catch(() => undefined);
        }
      }

      try {
        await handleReferralRewards(session, metadata);
      } catch (error) {
        captureException(error, {
          component: "stripe_webhook",
          action: "referral_rewards_error",
          metadata: { sessionId: session.id },
        });
      }

      if (metadata?.user_id && session.status === "complete") {
        try {
          const checkoutRepo = new CheckoutRepository(documentsClient);
          const existing = await checkoutRepo.findCheckoutBySessionId(session.id);
          if (!existing) {
            await checkoutRepo.createCheckout({
              userId: metadata.user_id,
              checkoutId: session.id,
              createdAt: new Date(),
              status: session.status?.toString() ?? "complete",
              lineItems: null,
            });
          }
        } catch (checkoutErr) {
          logger.error("Failed to persist checkout from webhook", {
            component: "stripe_webhook",
            action: "checkout_repo_insert",
            metadata: { sessionId: session.id, error: checkoutErr },
          });
        }
      }

      // Log payment successful
      if (metadata?.user_id) {
        try {
          await ActivityLogger.paymentSuccessful(
            session.amount_total || 0,
            session.currency || "usd",
            {
              sessionId: session.id,
              subscriptionId: session.subscription,
              customerId: session.customer,
            }
          );
        } catch (logErr) {
          console.error("Payment activity logging failed:", logErr);
        }

      }

      const pricingAbRaw = metadata?.pricing_ab_layout;
      if (
        typeof pricingAbRaw === "string" &&
        isPricingAbLayout(pricingAbRaw) &&
        metadata?.user_id
      ) {
        try {
          const db = await documentsClient.db();
          await db.collection("pricing_ab_events").insertOne({
            eventType: "purchase",
            layout: pricingAbRaw,
            userId: metadata.user_id,
            sessionId: session.id,
            amountTotal: session.amount_total ?? null,
            planName: typeof metadata.plan_name === "string" ? metadata.plan_name : null,
            purchasePage:
              typeof metadata.purchase_page === "string" ? metadata.purchase_page : null,
            createdAt: new Date(),
          });
        } catch (abErr) {
          console.error("pricing_ab purchase log failed:", abErr);
        }
      }

      const homeAbRaw = metadata?.home_ab_variant;
      if (
        typeof homeAbRaw === "string" &&
        isHomeAbExperimentVariant(homeAbRaw) &&
        metadata?.user_id
      ) {
        try {
          const db = await documentsClient.db();
          await db.collection("home_ab_events").insertOne({
            eventType: "purchase",
            variant: homeAbRaw,
            userId: metadata.user_id,
            sessionId: session.id,
            amountTotal: session.amount_total ?? null,
            planName: typeof metadata.plan_name === "string" ? metadata.plan_name : null,
            purchasePage:
              typeof metadata.purchase_page === "string" ? metadata.purchase_page : null,
            createdAt: new Date(),
          });
        } catch (abErr) {
          console.error("home_ab purchase log failed:", abErr);
        }
      }

      const pricingModelRaw = metadata?.pricing_ab_model;
      if (
        typeof pricingModelRaw === "string" &&
        isPricingModelAbVariant(pricingModelRaw) &&
        metadata?.user_id
      ) {
        try {
          const db = await documentsClient.db();
          await db.collection("pricing_model_ab_events").insertOne({
            eventType: "purchase",
            model: pricingModelRaw,
            userId: metadata.user_id,
            sessionId: session.id,
            amountTotal: session.amount_total ?? null,
            planName: typeof metadata.plan_name === "string" ? metadata.plan_name : null,
            purchasePage:
              typeof metadata.purchase_page === "string" ? metadata.purchase_page : null,
            createdAt: new Date(),
          });
        } catch (abErr) {
          console.error("pricing_model_ab purchase log failed:", abErr);
        }
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "checkout.session.async_payment_succeeded") {
      return NextResponse.json({ received: true });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      logger.info("Processing checkout.session.expired event", {
        component: "stripe_webhook",
        action: "checkout_expired",
        metadata: {
          sessionId: session.id,
          userId: metadata?.user_id || null,
        },
      });

      try {
        const checkoutRepo = new CheckoutRepository(documentsClient);
        await checkoutRepo.updateStatus(session.id, "expired");
      } catch (repoErr) {
        console.error("Failed to update expired checkout status:", repoErr);
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;
      if (metadata?.user_id) {
        await updateUserPublicMetadata(metadata.user_id, {
          planCancelled: false,
        });

        // Log subscription created
        try {
          await ActivityLogger.subscriptionCreated(
            subscription.items.data[0]?.price?.id || "unknown",
            {
              subscriptionId: subscription.id,
              customerId: subscription.customer,
              status: subscription.status,
            }
          );
        } catch (logErr) {
          console.error("Subscription activity logging failed:", logErr);
        }
      }
      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;
      if (subscription.cancel_at_period_end) {
        if (metadata?.user_id) {
          const periodEnd = subscriptionCurrentPeriodEndUnix(subscription);
          await updateUserPublicMetadata(metadata.user_id, {
            planCancelled: true,
            planExpiresAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            planRenewsAt: null,
          });
        }

        // Supabase direct sync: record cancellation in PG subscription table
        // (plan stays 'plus' until period ends — only upsert, no plan change)
        try {
          const cancelCustomerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : (subscription.customer as { id?: string } | null)?.id ?? null;
          if (cancelCustomerId) {
            await upsertStripeSubscription(subscription, cancelCustomerId).catch(() => undefined);
          }
        } catch (sbErr) {
          logger.error("subscription.updated cancel_at_period_end: Supabase upsert failed", {
            component: "stripe_webhook",
            action: "supabase_cancel_upsert_error",
            metadata: { error: sbErr },
          });
        }

        return NextResponse.json({ received: true });
      }

      if (
        metadata?.user_id &&
        (subscription.status === "active" ||
          subscription.status === "trialing")
      ) {
        const userId = metadata.user_id;
        let priceId: string | null = null;
        let resolvedPlan: { plan: string; planType?: string } | null = null;

        try {
          priceId = await ensureSubscriptionPriceId(subscription);
          if (!priceId) {
            logger.warn("subscription.updated: no price id on subscription", {
              component: "stripe_webhook",
              action: "subscription_updated_missing_price",
              userId,
              metadata: subscriptionUpdatedLogContext(subscription, userId),
            });
          } else {
            resolvedPlan = await resolvePlusPlanFromStripePrice(priceId, metadata);
          }
        } catch (lookupErr) {
          captureException(lookupErr, {
            component: "stripe_webhook",
            action: "subscription_updated_plan_lookup",
            userId,
            metadata: {
              ...subscriptionUpdatedLogContext(subscription, userId, priceId),
              ...serializeWebhookError(lookupErr),
            },
          });
        }

        if (resolvedPlan) {
          try {
            await updateUserPublicMetadata(userId, {
              plan: resolvedPlan.plan,
              planType: resolvedPlan.planType ?? metadata.plan_name,
              planCancelled: false,
              planExpiresAt: null,
            });
          } catch (metadataErr) {
            captureException(metadataErr, {
              component: "stripe_webhook",
              action: "subscription_updated_metadata_sync",
              userId,
              metadata: {
                ...subscriptionUpdatedLogContext(subscription, userId, priceId),
                plan: resolvedPlan.plan,
                ...serializeWebhookError(metadataErr),
              },
            });
          }

          try {
            const subCustomerId = subscriptionCustomerId(subscription);
            const sbProfile = await resolveUserProfileFromStripe(
              subCustomerId,
              userId,
            );
            if (sbProfile) {
              await grantPlusPlan(sbProfile.supabaseAuthUserId, sbProfile.profileId);
            }
            if (subCustomerId) {
              await upsertStripeSubscription(subscription, subCustomerId).catch(
                () => undefined,
              );
            }
          } catch (sbErr) {
            captureException(sbErr, {
              component: "stripe_webhook",
              action: "supabase_grant_plan_error",
              userId,
              metadata: {
                ...subscriptionUpdatedLogContext(subscription, userId, priceId),
                ...serializeWebhookError(sbErr),
              },
            });
          }
        }
      }

      return NextResponse.json({ received: true });
    }

    const checkoutRepo = new CheckoutRepository(documentsClient);
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any;
      const rawSubscription = invoice.subscription;
      const subscriptionId =
        typeof rawSubscription === "string"
          ? rawSubscription
          : rawSubscription?.id || null;

      if (subscriptionId) {
        try {
          const db = await documentsClient.db();
          await db.collection("stripe_subscriptions").updateOne(
            { stripeId: subscriptionId },
            {
              $set: {
                dunningStatus: "payment_failed",
                lastPaymentFailedAt: new Date(),
                updatedAt: new Date(),
              },
            }
          );
        } catch (err) {
          console.warn("Failed to update dunning snapshot in stripe_subscriptions", err);
        }

        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await stripe.subscriptions.update(subscriptionId, {
            metadata: {
              ...subscription.metadata,
              last_payment_failed_at_unix: `${Math.floor(Date.now() / 1000)}`,
            },
          });
          
        } catch (err) {
          console.warn("Failed to persist dunning metadata to Stripe subscription", err);
        }
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as any;
      const invoiceId = invoice?.id as string;

      const rawSubscription = invoice.subscription;
      let subscriptionId: string | null = null;
      if (typeof rawSubscription === "string") {
        subscriptionId = rawSubscription;
      } else if (
        rawSubscription &&
        typeof rawSubscription === "object" &&
        "id" in rawSubscription
      ) {
        subscriptionId = rawSubscription?.id;
      }
      let subscriptionMetadata: Record<string, string | undefined> | null = null;
      if (subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionMetadata = subscription.metadata as Record<string, string | undefined>;
        } catch {
          subscriptionMetadata = null;
        }
      }

      let sessionId: string | null = null;
      const paymentIntentId = invoice?.payment_intent as string | undefined;
      if (paymentIntentId) {
        const list = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });
        if (list.data.length) {
          sessionId = list?.data[0]?.id;
        }
      }

      if (!sessionId && subscriptionId) {
        const sessionsBySub = await stripe.checkout.sessions.list({
          subscription: subscriptionId,
          limit: 1,
        });
        if (sessionsBySub.data.length) {
          sessionId = sessionsBySub?.data[0]?.id;
        }
      }

      if (!sessionId) {
        const email = invoice.customer_email?.trim().toLowerCase();
        if (email) {
          try {
            const users: any = await authAdmin.users.getUserList({
              emailAddress: [email],
            });
            if (users?.data?.length) {
              const user = users.data[0];
              const lastCheckout = await checkoutRepo.findLastByUserId(user.id);
              if (lastCheckout) {
                await checkoutRepo.updateCreatedAtBySessionId(
                  String(lastCheckout.checkoutId),
                  new Date(
                    Number((invoice?.lines?.data[0]?.period as { start?: unknown } | undefined)?.start ?? 0) *
                      1000
                  )
                );
                await checkoutRepo.updateStatus(
                  String(lastCheckout.checkoutId),
                  "complete"
                );

                try {
                  const session = await stripe.checkout.sessions.retrieve(
                    String(lastCheckout.checkoutId)
                  );
                  if (session) {
                    await handleReferralRewards(session, session.metadata);
                  }
                } catch (err) {
                  console.error(
                    "Failed to process referral rewards from invoice branch:",
                    err
                  );
                }

                return NextResponse.json({ received: true });
              }
            }
          } catch (err) {
            console.error("Error finding user by email:", err);
          }
        }
        console.warn(
          `No checkout session or user found for invoice ${invoiceId}, skipping repository update`
        );
        return NextResponse.json({ received: true });
      }

      await checkoutRepo.updateCreatedAtBySessionId(
        sessionId,
        new Date((invoice?.lines?.data[0]?.period?.start as number) * 1000)
      );

      try {
        const session = await stripe.checkout.sessions.retrieve(
          sessionId as string
        );
        if (session) {
          await handleReferralRewards(session, session.metadata);
        }
      } catch (err) {
        console.error(
          "Failed to process referral rewards for resolved sessionId:",
          err
        );
      }

      const invoicePaymentIntentId = resolvePaymentIntentId(paymentIntentId);
      if (invoicePaymentIntentId) {
        const attributionSources =
          subscriptionMetadata && Object.keys(subscriptionMetadata).length > 0
            ? subscriptionMetadata
            : (await stripe.checkout.sessions
                .retrieve(sessionId as string)
                .then((s) => s.metadata as Record<string, string | undefined>)
                .catch(() => null)) ?? {};
        try {
          await stampPaymentIntentAttribution(
            invoicePaymentIntentId,
            buildChargeAttributionMetadata(attributionSources),
            {
              checkout_session_id: sessionId ?? "",
              invoice_id: invoiceId ?? "",
            }
          );
        } catch (stampErr) {
          logger.warn("Failed to stamp charge attribution on invoice payment", {
            component: "stripe_webhook",
            action: "stamp_invoice_charge_attribution",
            metadata: {
              invoiceId,
              paymentIntentId: invoicePaymentIntentId,
              error: stampErr,
            },
          });
        }
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      let { user_id, checkout_id } = subscription.metadata;
      if (!user_id || !checkout_id) {
        if (subscription.latest_invoice) {
          try {
            const invoice = (await stripe.invoices.retrieve(
              subscription.latest_invoice as string
            )) as Stripe.Invoice;
            const pi = (invoice as any).payment_intent as string | null;

            if (pi) {
              const sessions = await stripe.checkout.sessions.list({
                payment_intent: pi,
                limit: 1,
              });
              const sess: any = sessions.data[0];

              if (sess?.metadata?.user_id) user_id = sess.metadata.user_id;
              if (sess?.id) checkout_id = sess.id;
            }
          } catch (err) {
            console.warn("   ❗️ Fallback #1 error:", err);
          }
        }
      }

      if (!user_id || !checkout_id) {
        try {
          const sessionsBySub = await stripe.checkout.sessions.list({
            subscription: subscription.id,
            limit: 1,
          });
          const sess2: any = sessionsBySub.data[0];

          if (sess2?.metadata?.user_id) user_id = sess2.metadata.user_id;
          if (sess2?.id) checkout_id = sess2.id;
        } catch (err) {
          console.warn("   ❗️ Fallback #2 error:", err);
        }
      }

      if (!user_id && subscription.latest_invoice) {
        try {
          const invoice = (await stripe.invoices.retrieve(
            subscription.latest_invoice as string
          )) as Stripe.Invoice;
          const email = invoice.customer_email;

          if (email) {
            const users = await authAdmin.users.getUserList({
              emailAddress: [email.trim().toLowerCase()],
            });
            if (users.data.length) {
              user_id = users.data[0].id;
            }
          }
        } catch (err) {
          console.warn("   ❗️ Fallback #3 error:", err);
        }
      }

      if (user_id && !checkout_id) {
        try {
          const lastCheckout = await checkoutRepo.findLastByUserId(user_id);
          if (lastCheckout) {
            checkout_id = String(lastCheckout.checkoutId);
          }
        } catch (err) {
          console.warn("   ❗️ Fallback #4 error:", err);
        }
      }

      // Supabase direct revoke — runs BEFORE the bail-out so it fires even when
      // user_id / checkout_id couldn't be resolved from metadata. subscription.customer
      // is always present and is the most reliable lookup key after migration.
      const delCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : (subscription.customer as { id?: string } | null)?.id ?? null;
      try {
        const sbProfile = await resolveUserProfileFromStripe(
          delCustomerId,
          user_id || null,
        );
        if (sbProfile) {
          await revokePlusPlan(sbProfile.supabaseAuthUserId, sbProfile.profileId);
        }
        if (delCustomerId) {
          await upsertStripeSubscription(subscription, delCustomerId).catch(() => undefined);
        }
      } catch (sbErr) {
        logger.error("subscription.deleted: Supabase plan revoke failed", {
          component: "stripe_webhook",
          action: "supabase_revoke_plan_error",
          metadata: { error: sbErr },
        });
      }

      if (!user_id || !checkout_id || checkout_id === "{CHECKOUT_SESSION_ID}") {
        console.warn("❌ Still missing metadata for", subscription.id);
        return NextResponse.json({ received: true });
      }

      // Cancel and downgrade (Clerk-compat path — kept for safety during transition)
      await Promise.all([
        checkoutRepo.updateStatus(checkout_id, "cancelled"),
        updateUserPublicMetadata(user_id, { plan: "free" }),
      ]);

      // Log subscription cancelled
      try {
        await ActivityLogger.subscriptionCancelled(
          subscription.items.data[0]?.price?.id || "unknown",
          "webhook_cancelled",
          {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            checkoutId: checkout_id,
          }
        );
      } catch (logErr) {
        console.error(
          "Subscription cancellation activity logging failed:",
          logErr
        );
      }

      const subscriptionMetadata =
        (subscription.metadata as Record<string, string | undefined>) || {};
      void sendGa4Events({
        clientId: buildStripeGaClientId({
          metadata: subscriptionMetadata,
          customerId:
            typeof subscription.customer === "string" ? subscription.customer : null,
          userId: user_id || subscriptionMetadata.user_id || null,
          sessionId: checkout_id,
          subscriptionId: subscription.id,
        }),
        userId: user_id || subscriptionMetadata.user_id || undefined,
        gaSessionId: readGa4SessionIdForMp(subscriptionMetadata),
        events: [
          {
            name: "subscription_cancelled",
            params: {
              subscription_id: subscription.id,
              transaction_id: checkout_id,
              cancellation_reason: "stripe_subscription_deleted",
              ...buildStripeGaAttributionParams(subscriptionMetadata),
            },
          },
        ],
      });

      return NextResponse.json({ received: true });
    }

    // Handle dispute events
    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      const charge = dispute.charge as string;

      try {
        // Get charge details to find user
        const chargeDetails = await stripe.charges.retrieve(charge);
        const sessionId = chargeDetails.metadata?.session_id;

        if (sessionId) {
          const checkoutRepo = new CheckoutRepository(documentsClient);
          const checkout = await checkoutRepo.findBySessionId(sessionId);

          if (checkout?.userId) {
            await ActivityLogger.disputeCreated(
              dispute.id,
              dispute.amount,
              dispute.reason || "unknown",
              {
                disputeId: dispute.id,
                chargeId: charge,
                sessionId: sessionId,
                reason: dispute.reason,
                status: dispute.status,
              }
            );
          }
        }
      } catch (logErr) {
        console.error("Dispute activity logging failed:", logErr);
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "charge.dispute.updated") {
      const dispute = event.data.object as Stripe.Dispute;
      const charge = dispute.charge as string;

      try {
        // Get charge details to find user
        const chargeDetails = await stripe.charges.retrieve(charge);
        const sessionId = chargeDetails.metadata?.session_id;

        if (sessionId) {
          const checkoutRepo = new CheckoutRepository(documentsClient);
          const checkout = await checkoutRepo.findBySessionId(sessionId);

          if (checkout?.userId) {
            await ActivityLogger.disputeResolved(dispute.id, dispute.status, {
              disputeId: dispute.id,
              chargeId: charge,
              sessionId: sessionId,
              reason: dispute.reason,
              status: dispute.status,
            });
          }
        }
      } catch (logErr) {
        console.error("Dispute resolution activity logging failed:", logErr);
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "charge.refunded") {
      const chargeObj = event.data.object as any;
      const refundId = chargeObj.id as string;
      let sessionId: string | null = null;

      const paymentIntentId = chargeObj.payment_intent as string | undefined;
      if (paymentIntentId) {
        const resp = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 10,
        });
        if (resp.data.length > 0) {
          const sortedSessions = resp.data.sort(
            (a, b) => (b as any).created - (a as any).created
          );
          sessionId = sortedSessions[0].id;
        }
      }

      if (!sessionId && chargeObj.invoice) {
        const inv: any = (await stripe.invoices.retrieve(
          chargeObj.invoice as string
        )) as Stripe.Invoice;
        const pi = inv.payment_intent as string | undefined;
        if (pi) {
          const resp2 = await stripe.checkout.sessions.list({
            payment_intent: pi,
            limit: 10,
          });
          if (resp2.data.length > 0) {
            const sortedSessions2 = resp2.data.sort(
              (a, b) => (b as any).created - (a as any).created
            );
            sessionId = sortedSessions2[0].id;
          }
        }
      }

      if (!sessionId) {
        let email = chargeObj.billing_details?.email;
        if (!email && chargeObj.invoice) {
          const inv = await stripe.invoices.retrieve(
            chargeObj.invoice as string
          );
          email = inv.customer_email ?? undefined;
        }

        if (email) {
          const users = await authAdmin.users.getUserList({
            emailAddress: [email.trim().toLowerCase()],
          });
          if (users.data.length) {
            const allCheckouts = await checkoutRepo.findAllByUserId(
              users.data[0].id
            );
            const refundedCheckout = allCheckouts.find(
              (c: any) => c.status === "refunded"
            );
            sessionId = refundedCheckout?.checkoutId ?? null;
          }
        }
      }

      // 4. Fallback: retrieve sessionId from subscription metadata
      if (!sessionId && chargeObj.invoice) {
        try {
          const invFallback = (await stripe.invoices.retrieve(
            chargeObj.invoice as string
          )) as any;
          const subId = invFallback.subscription as string | null;
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            const checkoutFromMeta = sub.metadata.checkout_id;
            if (checkoutFromMeta) {
              sessionId = checkoutFromMeta;
            }
          }
        } catch (err) {
          console.warn("   ❗️ Fallback #4 error:", err);
        }
      }

      if (!sessionId) {
        // Fallback: process refund via invoice.subscription like subscription.deleted
        if (chargeObj.invoice) {
          const inv = (await stripe.invoices.retrieve(
            chargeObj.invoice as string
          )) as any;
          const subscriptionId = inv.subscription as string | null;
          if (subscriptionId) {
            // Retrieve subscription metadata and cancel
            let subRecord: Stripe.Subscription | null = null;
            try {
              subRecord = await stripe.subscriptions.retrieve(subscriptionId);
            } catch (err: any) {
              if (err?.code === "resource_missing") {
                console.warn(
                  `❌ Subscription not found in fallback: ${subscriptionId}`
                );
              } else {
                throw err;
              }
            }
            await stripe.subscriptions.cancel(subscriptionId);
            const userId = subRecord?.metadata.user_id ?? null;
            const checkoutId = subRecord?.metadata.checkout_id ?? null;
            if (checkoutId) {
              await checkoutRepo.updateStatus(checkoutId, "refunded");
            }
            if (userId) {
              await authAdmin.users.updateUserMetadata(userId, {
                publicMetadata: { plan: "free" },
                allowPlanDowngrade: true,
              });
            }
            return NextResponse.json({ received: true });
          }
        }
        // 5. Fallback: downgrade user via invoice.customer_email if still no update
        if (chargeObj.invoice) {
          try {
            const invEmail = (await stripe.invoices.retrieve(
              chargeObj.invoice as string
            )) as any;
            const customerEmail = invEmail.customer_email;
            if (customerEmail) {
              const usersByEmail = await authAdmin.users.getUserList({
                emailAddress: [customerEmail.trim().toLowerCase()],
              });
              if (usersByEmail.data.length) {
                const fallbackUserId = usersByEmail.data[0].id;
                await updateUserPublicMetadata(fallbackUserId, {
                  plan: "free",
                });
              }
            }
          } catch (err) {
            console.warn("   ❗️ Fallback #5 error:", err);
          }
        }
        // 6. Fallback: DB lookup for sessionId via billing email
        let emailForDB: string | undefined = chargeObj.billing_details?.email;
        if (!emailForDB && chargeObj.invoice) {
          const invEmailSearch = await stripe.invoices.retrieve(
            chargeObj.invoice as string
          );
          emailForDB = invEmailSearch.customer_email ?? undefined;
        }
        if (emailForDB) {
          const usersByEmail2 = await authAdmin.users.getUserList({
            emailAddress: [emailForDB.trim().toLowerCase()],
          });
          if (usersByEmail2.data.length) {
            const allCheckouts2 = await checkoutRepo.findAllByUserId(
              usersByEmail2.data[0].id
            );
            if (allCheckouts2.length) {
              const lastCheckout2 = allCheckouts2.sort(
                (a, b) =>
                  new Date((b as any).createdAt).getTime() -
                  new Date((a as any).createdAt).getTime()
              )[0];
              const resolvedSessionId = lastCheckout2.checkoutId;
              await checkoutRepo.updateStatus(resolvedSessionId, "refunded");
              return NextResponse.json({ received: true });
            }
          }
        }
        console.warn(
          `⚠️ Refund ${refundId} but no sessionId found — skipping.`
        );
        return NextResponse.json({ received: true });
      }

      await checkoutRepo.updateStatus(sessionId, "refunded");

      let userId: string | null = null;
      const sess = await stripe.checkout.sessions.retrieve(sessionId);

      if (sess.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(
            sess.subscription as string
          );
          userId = sub.metadata.user_id ?? null;

          await stripe.subscriptions.cancel(sub.id);
        } catch (err: any) {
          if (err?.code === "resource_missing") {
            console.warn(`❌ Subscription not found: ${sess.subscription}`);
          } else {
            throw err;
          }
        }
      }

      if (!userId) {
        const record = await checkoutRepo.findBySessionId(sessionId);
        userId = record?.userId != null ? String(record.userId) : null;
      }

      if (userId) {
        await updateUserPublicMetadata(userId, { plan: "free" });
      } else {
        console.warn(`⚠️ Cannot find user for refunded session ${sessionId}.`);
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failure" },
      { status: 500 }
    );
  }
}
