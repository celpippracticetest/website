import { NextResponse } from "next/server";
import Stripe from "stripe";
import mongoClient from "@/lib/mongodb";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { ReferralRewardRepository } from "@/repositories/referral-reward.repo";
import { ReferralRepository } from "@/repositories/referral.repo";
import { ReferralInvitationRepository } from "@/repositories/referral-invitation.repo";
import { clerkClient } from "@clerk/nextjs/server";
import { ActivityLogger } from "@/lib/userActivity";
import { isPricingAbLayout } from "@/lib/pricingAbTest";
import { isHomeAbExperimentVariant } from "@/lib/homeAbTest";
import { getAccessTierKey } from "@/lib/pricing";
import { toSerializedPlan } from "@/lib/planSerialization";
import type { Plan } from "@/models/plans.model";
import { logger, captureException, trackAPICall } from "@/lib/sentry-logger";
import { findOrCreateClerkUserByEmail } from "@/lib/clerkGuestCheckout";
import { planNameIndicatesPremiumPlus } from "@/lib/subscriptionAccess";
import { persistStripeCustomerIdToMongo } from "@/lib/resolveStripeCustomerId";
import { recordPartnerCommissionFromMongoUser } from "@/lib/partner/recordPartnerCommissionFromMongoUser";
import {
  sendGa4Events,
  type Ga4ItemParam,
} from "@/lib/ga4MeasurementProtocol";
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

function inferAttributionSource(
  metadata: Record<string, string | undefined> | null | undefined
): string {
  const utmSource = readMetadataValue(metadata, "utm_source");
  if (utmSource) return utmSource;

  const gclid = readMetadataValue(metadata, "gclid");
  const gbraid = readMetadataValue(metadata, "gbraid");
  const wbraid = readMetadataValue(metadata, "wbraid");
  if (gclid || gbraid || wbraid) return "google_ads";
  if (readMetadataValue(metadata, "msclkid")) return "microsoft_ads";
  if (readMetadataValue(metadata, "fbclid")) return "meta_ads";
  if (readMetadataValue(metadata, "ttclid")) return "tiktok_ads";
  return "direct";
}

function buildStripeGaClientId(args: {
  metadata?: Record<string, string | undefined> | null;
  customerId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  subscriptionId?: string | null;
}): string {
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

/** GA4 `purchase.items` from Checkout Session (Measurement Protocol). */
function buildStripeCheckoutPurchaseItems(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string | undefined>
): Ga4ItemParam[] {
  const value = (session.amount_total || 0) / 100;
  const planName =
    readMetadataValue(metadata, "plan_name") || "CELPIP Plan";
  const mockId = readMetadataValue(metadata, "mock_exam_id");
  const itemId =
    mockId ||
    readMetadataValue(metadata, "plan_name") ||
    (session.mode === "subscription" ? "subscription" : "checkout");
  return [
    {
      item_id: itemId,
      item_name: planName,
      price: value,
      quantity: 1,
      item_category: "Subscription",
    },
  ];
}

function buildStripeRenewalPurchaseItems(
  invoice: { amount_paid?: number | null },
  planName: string | null
): Ga4ItemParam[] {
  const value = (invoice.amount_paid || 0) / 100;
  const label = planName?.trim() || "Subscription renewal";
  const itemId = planName?.trim() || "subscription_renewal";
  return [
    {
      item_id: itemId.slice(0, 100),
      item_name: label.slice(0, 100),
      price: value,
      quantity: 1,
      item_category: "Subscription",
    },
  ];
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
  return {
    source: inferAttributionSource(metadata),
    medium: readMetadataValue(metadata, "utm_medium") || "",
    campaign: readMetadataValue(metadata, "utm_campaign") || "",
    utm_source: readMetadataValue(metadata, "utm_source") || "",
    utm_medium: readMetadataValue(metadata, "utm_medium") || "",
    utm_campaign: readMetadataValue(metadata, "utm_campaign") || "",
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
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const currentMetadata = user.publicMetadata || {};
    const updatedMetadata = { ...currentMetadata, ...newFields };

    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: updatedMetadata,
    });
    logger.info("Successfully updated metadata for user", {
      component: "stripe_webhook",
      action: "update_user_metadata",
      userId,
      metadata: { fields: Object.keys(newFields) },
    });

    // Sync to MongoDB users collection
    try {
      const db = await mongoClient.db();
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

      await usersCollection.updateOne(
        { clerkUserId: userId },
        { $set: updateDoc },
        { upsert: true } // Upsert just in case, though user should exist
      );

      await recordPartnerCommissionFromMongoUser(userId);
    } catch (dbErr) {
      logger.error(" Failed to sync metadata to MongoDB", {
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
    const clerk = await clerkClient();
    const metaUserId = metadata?.user_id as string | undefined;
    let userIdToUse: string | undefined = metaUserId;

    let user;
    let userMetadata: any = {};

    try {
      if (userIdToUse) {
        user = await clerk.users.getUser(userIdToUse);
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
          const users = await clerk.users.getUserList({
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
            console.warn(`❌ No Clerk user found by email ${inviteeEmail}`);
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
    const referralRepo = new ReferralRepository(mongoClient);
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

    const rewardRepo = new ReferralRewardRepository(mongoClient);
    await rewardRepo.ensureIndexes();

    try {
      await rewardRepo.createReward({
        inviterId: referrer.userId,
        inviteeId: userIdToUse as string,
        referralCode,
        amount: rewardAmount,
        status: "confirmed",
        checkoutId: session.id,
        planPurchased: metadata.plan_name || "premium",
        purchaseAmount: amountTotal / 100,
        purchaseDate: new Date(),
      });

      // Update referrer's metadata with reward information
      const referrerUser = await clerk.users.getUser(referrer.userId);
      const currentMetadata = referrerUser.publicMetadata || {};
      const currentTotalRewards = (currentMetadata as any)?.totalRewards || 0;
      const newTotalRewards = currentTotalRewards + rewardAmount;

      const invitationRepo = new ReferralInvitationRepository(mongoClient);
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

      await clerk.users.updateUserMetadata(referrer.userId, {
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
      const freshUser = await clerk.users.getUser(userIdToUse as string);
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

        await clerk.users.updateUserMetadata(userIdToUse as string, {
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

    const clerk = await clerkClient();

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
          const userId = await findOrCreateClerkUserByEmail(payEmail);
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

      if (
        metadata?.user_id &&
        typeof session.customer === "string" &&
        session.customer
      ) {
        await persistStripeCustomerIdToMongo(metadata.user_id, session.customer);
      }

      if (metadata?.user_id) {
        // Get user metadata to check for any existing discounts
        const user = await clerk.users.getUser(metadata.user_id);
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
            plan: planNameIndicatesPremiumPlus(metadata.plan_name) ? "pro" : "premium",
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
            plan: planNameIndicatesPremiumPlus(metadata.plan_name) ? "pro" : "premium",
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
          const checkoutRepo = new CheckoutRepository(mongoClient);
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

      // GA4 standard `purchase` (Measurement Protocol) — source of truth when
      // the success page / GTM never runs (ad blockers, tab closed, etc.).
      const checkoutPlanName = readMetadataValue(metadata, "plan_name");
      void sendGa4Events({
        clientId: buildStripeGaClientId({
          metadata,
          customerId:
            typeof session.customer === "string" ? session.customer : null,
          userId: metadata?.user_id || null,
          sessionId: session.id,
          subscriptionId:
            typeof session.subscription === "string"
              ? session.subscription
              : null,
        }),
        userId: metadata?.user_id || undefined,
        events: [
          {
            name: "purchase",
            params: {
              transaction_id: session.id,
              value: (session.amount_total || 0) / 100,
              currency: (session.currency || "usd").toUpperCase(),
              purchase_type: metadata?.purchase_type || "first_purchase",
              billing_mode:
                session.mode === "subscription" ? "subscription" : "one_time",
              ...(checkoutPlanName ? { plan_name: checkoutPlanName } : {}),
              items: buildStripeCheckoutPurchaseItems(session, metadata),
              ...buildStripeGaAttributionParams(metadata),
            },
          },
        ],
      });

      const pricingAbRaw = metadata?.pricing_ab_layout;
      if (
        typeof pricingAbRaw === "string" &&
        isPricingAbLayout(pricingAbRaw) &&
        metadata?.user_id
      ) {
        try {
          const db = await mongoClient.db();
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
          const db = await mongoClient.db();
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
        const checkoutRepo = new CheckoutRepository(mongoClient);
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
        return NextResponse.json({ received: true });
      }

      if (
        metadata?.user_id &&
        (subscription.status === "active" ||
          subscription.status === "trialing")
      ) {
        try {
          const item = subscription.items.data[0];
          const priceRaw = item?.price;
          const priceId =
            typeof priceRaw === "string"
              ? priceRaw
              : priceRaw && typeof priceRaw === "object" && "id" in priceRaw
                ? (priceRaw as Stripe.Price).id
                : null;

          if (priceId) {
            const db = await mongoClient.db();
            const planDoc = await db.collection("plans").findOne({
              isActive: true,
              stripePriceId: priceId,
            });

            let plan: string | null = null;
            let planType: string | undefined;

            if (planDoc) {
              const serialized = toSerializedPlan(planDoc as Plan);
              const tier = getAccessTierKey(serialized);
              planType = (planDoc as Plan).title;
              if (tier === "premiumPlus") plan = "pro";
              else if (tier === "premium") plan = "premium";
            }

            if (
              !plan &&
              typeof metadata.plan_name === "string" &&
              metadata.plan_name.trim()
            ) {
              planType = metadata.plan_name;
              plan = planNameIndicatesPremiumPlus(metadata.plan_name) ? "pro" : "premium";
            }

            if (plan) {
              await updateUserPublicMetadata(metadata.user_id, {
                plan,
                planType: planType ?? metadata.plan_name,
                planCancelled: false,
                planExpiresAt: null,
              });
            }
          }
        } catch (syncErr) {
          logger.error("subscription.updated: plan metadata sync failed", {
            component: "stripe_webhook",
            action: "subscription_updated_plan_sync",
            metadata: { error: syncErr },
          });
        }
      }

      return NextResponse.json({ received: true });
    }

    const checkoutRepo = new CheckoutRepository(mongoClient);
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any;
      const rawSubscription = invoice.subscription;
      const subscriptionId =
        typeof rawSubscription === "string"
          ? rawSubscription
          : rawSubscription?.id || null;

      if (subscriptionId) {
        try {
          const db = await mongoClient.db();
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
      const billingReason =
        typeof invoice?.billing_reason === "string" ? invoice.billing_reason : "";
      const invoicePurchaseType =
        billingReason === "subscription_cycle"
          ? "subscription_renewal"
          : "first_purchase";

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
            const users: any = await clerk.users.getUserList({
              emailAddress: [email],
            });
            if (users?.data?.length) {
              const user = users.data[0];
              const lastCheckout = await checkoutRepo.findLastByUserId(user.id);
              if (lastCheckout) {
                await checkoutRepo.updateCreatedAtBySessionId(
                  lastCheckout.checkoutId,
                  new Date(
                    (invoice?.lines?.data[0]?.period?.start as number) * 1000
                  )
                );
                await checkoutRepo.updateStatus(
                  lastCheckout.checkoutId,
                  "complete"
                );

                try {
                  const session = await stripe.checkout.sessions.retrieve(
                    lastCheckout.checkoutId
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

                // Subscription renewals: `purchase` here only. Initial checkout
                // is counted from `checkout.session.completed` (avoid duplicate).
                if (invoicePurchaseType === "subscription_renewal") {
                  const renewalPlanName = readMetadataValue(
                    subscriptionMetadata ?? undefined,
                    "plan_name"
                  );
                  void sendGa4Events({
                    clientId: buildStripeGaClientId({
                      metadata: subscriptionMetadata,
                      customerId:
                        typeof invoice?.customer === "string"
                          ? invoice.customer
                          : null,
                      userId: user.id,
                      sessionId: lastCheckout.checkoutId,
                      subscriptionId,
                    }),
                    userId: user.id,
                    events: [
                      {
                        name: "purchase",
                        params: {
                          transaction_id: invoiceId || lastCheckout.checkoutId,
                          invoice_id: invoiceId || "",
                          subscription_id: subscriptionId || "",
                          purchase_type: "subscription_renewal",
                          value: (invoice?.amount_paid || 0) / 100,
                          currency: (invoice?.currency || "usd").toUpperCase(),
                          billing_reason: billingReason,
                          ...(renewalPlanName ? { plan_name: renewalPlanName } : {}),
                          items: buildStripeRenewalPurchaseItems(
                            invoice,
                            renewalPlanName
                          ),
                          ...buildStripeGaAttributionParams(subscriptionMetadata),
                        },
                      },
                    ],
                  });
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
        if (invoicePurchaseType === "subscription_renewal") {
          const renewalPlanName = readMetadataValue(
            subscriptionMetadata ?? undefined,
            "plan_name"
          );
          void sendGa4Events({
            clientId: buildStripeGaClientId({
              metadata: subscriptionMetadata,
              customerId:
                typeof invoice?.customer === "string" ? invoice.customer : null,
              userId: null,
              sessionId: null,
              subscriptionId,
            }),
            events: [
              {
                name: "purchase",
                params: {
                  transaction_id: invoiceId || "",
                  invoice_id: invoiceId || "",
                  subscription_id: subscriptionId || "",
                  purchase_type: "subscription_renewal",
                  value: (invoice?.amount_paid || 0) / 100,
                  currency: (invoice?.currency || "usd").toUpperCase(),
                  billing_reason: billingReason,
                  ...(renewalPlanName ? { plan_name: renewalPlanName } : {}),
                  items: buildStripeRenewalPurchaseItems(invoice, renewalPlanName),
                  ...buildStripeGaAttributionParams(subscriptionMetadata),
                },
              },
            ],
          });
        }
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

          const metadata = session.metadata as Record<string, string | undefined>;
          const billingReason =
            typeof invoice?.billing_reason === "string"
              ? invoice.billing_reason
              : "";
          const purchaseType =
            billingReason === "subscription_cycle"
              ? "subscription_renewal"
              : "first_purchase";

          if (purchaseType === "subscription_renewal") {
            const renewalPlanName = readMetadataValue(metadata, "plan_name");
            void sendGa4Events({
              clientId: buildStripeGaClientId({
                metadata,
                customerId:
                  typeof invoice?.customer === "string" ? invoice.customer : null,
                userId: metadata?.user_id || null,
                sessionId: session.id,
                subscriptionId,
              }),
              userId: metadata?.user_id || undefined,
              events: [
                {
                  name: "purchase",
                  params: {
                    transaction_id: invoiceId || session.id,
                    invoice_id: invoiceId || "",
                    subscription_id: subscriptionId || "",
                    purchase_type: "subscription_renewal",
                    value: (invoice?.amount_paid || 0) / 100,
                    currency: (invoice?.currency || "usd").toUpperCase(),
                    billing_reason: billingReason,
                    ...(renewalPlanName ? { plan_name: renewalPlanName } : {}),
                    items: buildStripeRenewalPurchaseItems(invoice, renewalPlanName),
                    ...buildStripeGaAttributionParams(metadata),
                  },
                },
              ],
            });
          }
        }
      } catch (err) {
        console.error(
          "Failed to process referral rewards for resolved sessionId:",
          err
        );
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
            const users = await clerk.users.getUserList({
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
            checkout_id = lastCheckout.checkoutId;
          }
        } catch (err) {
          console.warn("   ❗️ Fallback #4 error:", err);
        }
      }

      if (!user_id || !checkout_id || checkout_id === "{CHECKOUT_SESSION_ID}") {
        console.warn("❌ Still missing metadata for", subscription.id);
        return NextResponse.json({ received: true });
      }

      // Cancel and downgrade
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
          const checkoutRepo = new CheckoutRepository(mongoClient);
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
          const checkoutRepo = new CheckoutRepository(mongoClient);
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
          const users = await clerk.users.getUserList({
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
              await clerk.users.updateUserMetadata(userId, {
                publicMetadata: { plan: "free" },
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
              const usersByEmail = await clerk.users.getUserList({
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
          const usersByEmail2 = await clerk.users.getUserList({
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
        userId = record?.userId ?? null;
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
