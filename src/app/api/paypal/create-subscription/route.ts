import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/server-auth";
import { stripe } from "@/lib/stripe";
import { getDb } from "@/lib/appDocumentsClient";
import { logger } from "@/lib/sentry-logger";
import { isPricingAbLayout } from "@/lib/pricingAbTest";
import { isHomeAbExperimentVariant, isHomeAbVariant } from "@/lib/homeAbTest";
import { safeStripePriceId } from "@/lib/checkoutCancelUrl";
import { getPayPalCheckoutPublicOrigin } from "@/lib/requestOrigin";
import { paypalSubscriptionsConfigured } from "@/lib/paypal/config";
import { resolvePayPalPlanIdForStripePrice } from "@/lib/paypal/planMap";
import { resolveOrCreatePayPalPromoUpgradePlanId } from "@/lib/paypal/billingPlans";
import { createPayPalSubscription } from "@/lib/paypal/subscriptionsApi";
import { ensurePayPalGrantsIndex } from "@/lib/paypal/finalizeSubscriptionReturn";
import {
  FINAL_OFFER_CHALLENGE_SOURCE,
  isValidFinalOfferChallengeCombo,
  tierKeyFromCombo,
} from "@/lib/finalOfferChallenge";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import {
  matchUsersCollectionByWebUserIds,
  supabaseAuthUserIdFieldsOnUserDoc,
} from "@/lib/users/userDocumentIdentity";
import { objectIdLikeToHex } from "@/lib/pg/document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PENDING_COLL = "paypal_subscription_pending";

function readAttributionString(
  attribution: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  if (!attribution || typeof attribution !== "object") return null;
  const v = attribution[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function POST(req: NextRequest) {
  try {
    if (!paypalSubscriptionsConfigured()) {
      return NextResponse.json(
        { error: "PayPal subscriptions are not configured" },
        { status: 503 }
      );
    }

    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      stripePriceId?: string;
      attribution?: Record<string, unknown>;
      pricingAbLayout?: string;
      /** Mirrors POST `final_offer` on Stripe checkout (`onboarding_final_chance` → 20% off first period). */
      finalOffer?: string;
      /** Same semantics as POST fields `challenge_mode` / `challenge_target_clb` / `challenge_window_days` on Stripe checkout. */
      challenge?: {
        mode?: string;
        targetClb?: number;
        windowDays?: number;
        refundPercent?: number;
        offerSource?: string;
      };
    } | null;

    const stripePriceId = safeStripePriceId(body?.stripePriceId);
    if (!stripePriceId) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const paypalPlanId = await resolvePayPalPlanIdForStripePrice(stripePriceId);
    if (!paypalPlanId) {
      return NextResponse.json(
        { error: "No PayPal plan mapped for this price" },
        { status: 400 }
      );
    }

    const priceObject = await stripe.prices.retrieve(stripePriceId);
    const productId =
      typeof priceObject.product === "string"
        ? priceObject.product
        : priceObject.product.id;
    const productDetails = await stripe.products.retrieve(productId);
    const planDisplayName =
      typeof productDetails.name === "string" && productDetails.name.trim()
        ? productDetails.name.trim()
        : "Subscription";

    const attr = body?.attribution;
    const pricingAbRaw = typeof body?.pricingAbLayout === "string" ? body.pricingAbLayout : null;
    const pricingAbLayout =
      pricingAbRaw && isPricingAbLayout(pricingAbRaw) ? pricingAbRaw : null;
    const homeAbRaw = readAttributionString(attr, "home_ab_variant");
    const homeAbVariant =
      homeAbRaw && isHomeAbVariant(homeAbRaw) ? homeAbRaw : null;

    const rawCh = body?.challenge;
    const challengeModeParsed =
      rawCh && typeof rawCh === "object" && typeof rawCh.mode === "string"
        ? rawCh.mode.trim()
        : "";
    const challengeTargetClbParsed =
      rawCh && typeof rawCh === "object" && typeof rawCh.targetClb === "number"
        ? rawCh.targetClb
        : Number.NaN;
    const challengeWindowDaysParsed =
      rawCh && typeof rawCh === "object" && typeof rawCh.windowDays === "number"
        ? rawCh.windowDays
        : Number.NaN;
    const challengeRefundPercentParsed =
      rawCh && typeof rawCh === "object" && typeof rawCh.refundPercent === "number"
        ? rawCh.refundPercent
        : Number.NaN;
    const challengeOfferSourceParsed =
      rawCh && typeof rawCh === "object" && typeof rawCh.offerSource === "string"
        ? rawCh.offerSource.trim()
        : "";

    const hasChallengePayload =
      challengeModeParsed === "refund_goal" &&
      challengeOfferSourceParsed === FINAL_OFFER_CHALLENGE_SOURCE &&
      Number.isFinite(challengeTargetClbParsed) &&
      Number.isFinite(challengeWindowDaysParsed) &&
      Number.isFinite(challengeRefundPercentParsed) &&
      isValidFinalOfferChallengeCombo(
        challengeWindowDaysParsed,
        challengeRefundPercentParsed
      );

    const challengeDeadlineIso = hasChallengePayload
      ? new Date(
          Date.now() + challengeWindowDaysParsed * 24 * 60 * 60 * 1000
        ).toISOString()
      : null;

    const finalOfferRaw =
      typeof body?.finalOffer === "string" ? body.finalOffer.trim() : "";
    const isOnboardingFinalOffer =
      finalOfferRaw === "onboarding_final_chance" && !hasChallengePayload;

    let planIdForPayPal = paypalPlanId;
    if (isOnboardingFinalOffer) {
      const unitCents = priceObject.unit_amount;
      const currency = (priceObject.currency || "cad").toLowerCase();
      if (unitCents == null || unitCents < 1 || !priceObject.recurring) {
        return NextResponse.json(
          { error: "This price is not valid for the final-offer PayPal checkout" },
          { status: 400 }
        );
      }
      const promoCents = Math.round(unitCents * 0.8);
      if (promoCents < 1 || promoCents >= unitCents) {
        return NextResponse.json(
          { error: "Could not apply final-offer pricing for PayPal" },
          { status: 400 }
        );
      }
      try {
        planIdForPayPal = await resolveOrCreatePayPalPromoUpgradePlanId({
          basePayPalPlanId: paypalPlanId,
          promoFirstPeriodCents: promoCents,
          regularUnitCents: unitCents,
          currency,
          nameHint: `Final offer 20% ${planDisplayName}`.slice(0, 127),
        });
      } catch (promoErr) {
        const msg =
          promoErr instanceof Error ? promoErr.message : "PayPal promo plan error";
        logger.error("PayPal final-offer billing plan failed", {
          component: "paypal_create_subscription",
          metadata: { error: msg },
        });
        return NextResponse.json(
          { error: "Could not start PayPal checkout with the final-offer discount. Try Stripe or try again later." },
          { status: 502 }
        );
      }
    }

    const db = await getDb();

    try {
      await ensurePayPalGrantsIndex();
    } catch {
      /* index may already exist */
    }

    const challengeTierKey = hasChallengePayload
      ? tierKeyFromCombo(challengeWindowDaysParsed, challengeRefundPercentParsed)
      : null;

    if (hasChallengePayload) {
      await db.collection("users").updateOne(
        matchUsersCollectionByWebUserIds(user.id),
        {
          $set: {
            challenge: {
              mode: "refund_goal",
              targetClb: challengeTargetClbParsed,
              windowDays: challengeWindowDaysParsed,
              refundPercent: challengeRefundPercentParsed,
              offerSource: FINAL_OFFER_CHALLENGE_SOURCE,
              tierKey: challengeTierKey,
              startsAt: new Date(),
              deadlineAt: challengeDeadlineIso ? new Date(challengeDeadlineIso) : null,
              status: "active",
              updatedAt: new Date(),
            },
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
            ...(isLikelySupabaseAuthUserId(user.id)
              ? supabaseAuthUserIdFieldsOnUserDoc(user.id)
              : { clerkUserId: user.id }),
          },
        },
        { upsert: true }
      );
    }

    const pendingDoc = {
      clerkUserId: user.id,
      supabaseUserId: user.id,
      sub: user.id,
      stripePriceId,
      planDisplayName,
      pricingAbLayout,
      homeAbVariant,
      finalOfferSource: isOnboardingFinalOffer ? "onboarding_final_chance" : null,
      challengeMode: hasChallengePayload ? "refund_goal" : null,
      challengeTargetClb: hasChallengePayload ? challengeTargetClbParsed : null,
      challengeWindowDays: hasChallengePayload ? challengeWindowDaysParsed : null,
      challengeRefundPercent: hasChallengePayload ? challengeRefundPercentParsed : null,
      challengeTierKey: hasChallengePayload ? challengeTierKey : null,
      challengeDeadlineAt:
        hasChallengePayload && challengeDeadlineIso
          ? new Date(challengeDeadlineIso)
          : null,
      createdAt: new Date(),
    };
    const insert = await db.collection(PENDING_COLL).insertOne(pendingDoc);
    const customId =
      objectIdLikeToHex(insert.insertedId) ?? String(insert.insertedId);

    const origin = await getPayPalCheckoutPublicOrigin();
    const returnUrl = `${origin}/api/paypal/subscription-return`;
    const cancelUrl =
      isOnboardingFinalOffer || hasChallengePayload
        ? `${origin}/final-offer?paypal=cancel`
        : `${origin}/pricing?paypal=cancel`;

    const email = user.primaryEmailAddress?.emailAddress?.trim();
    const skipSubscriberEmail =
      process.env.PAYPAL_SKIP_SUBSCRIBER_EMAIL === "true" ||
      process.env.PAYPAL_SKIP_SUBSCRIBER_EMAIL === "1";
    const brand =
      process.env.PAYPAL_BRAND_NAME?.trim() || "CELPIP Practice Test";

    const paypalBody = await createPayPalSubscription({
      plan_id: planIdForPayPal,
      custom_id: customId,
      ...(email && !skipSubscriberEmail ? { subscriber: { email_address: email } } : {}),
      application_context: {
        brand_name: brand,
        locale: "en-CA",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    });

    const approve = paypalBody.links?.find((l) => l.rel === "approve");
    if (!approve?.href) {
      await db.collection(PENDING_COLL).deleteOne({ _id: insert.insertedId });
      return NextResponse.json(
        { error: "PayPal did not return an approval URL" },
        { status: 502 }
      );
    }

    if (pricingAbLayout) {
      try {
        await db.collection("pricing_ab_events").insertOne({
          eventType: "checkout_started",
          layout: pricingAbLayout,
          userId: user.id,
          priceId: stripePriceId,
          planName: planDisplayName,
          createdAt: new Date(),
        });
      } catch (abErr) {
        logger.error("pricing_ab PayPal checkout_started log failed", {
          component: "paypal_create_subscription",
          metadata: { error: abErr },
        });
      }
    }

    if (homeAbVariant && isHomeAbExperimentVariant(homeAbVariant)) {
      try {
        await db.collection("home_ab_events").insertOne({
          eventType: "checkout_started",
          variant: homeAbVariant,
          userId: user.id,
          priceId: stripePriceId,
          planName: planDisplayName,
          createdAt: new Date(),
        });
      } catch (abErr) {
        logger.error("home_ab PayPal checkout_started log failed", {
          component: "paypal_create_subscription",
          metadata: { error: abErr },
        });
      }
    }

    logger.info("PayPal subscription created (pending approval)", {
      component: "paypal_create_subscription",
      userId: user.id,
      metadata: {
        pendingId: customId,
        paypalSubscriptionId: paypalBody.id,
        onboardingFinalOffer: isOnboardingFinalOffer,
        refundChallenge: hasChallengePayload,
        returnUrl,
        cancelUrl,
      },
    });

    return NextResponse.json({
      approvalUrl: approve.href,
      paypalSubscriptionId: paypalBody.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "PayPal error";
    logger.error("PayPal create-subscription failed", {
      component: "paypal_create_subscription",
      metadata: { error: message },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
