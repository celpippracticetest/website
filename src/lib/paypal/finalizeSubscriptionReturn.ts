import { ObjectId } from "bson";
import { getDb } from "@/lib/mongodb";
import { logger, captureException } from "@/lib/sentry-logger";
import { isPricingAbLayout } from "@/lib/pricingAbTest";
import { isHomeAbExperimentVariant, isHomeAbVariant } from "@/lib/homeAbTest";
import { ActivityLogger } from "@/lib/userActivity";
import { stripe } from "@/lib/stripe";
import { getPayPalSubscription } from "./subscriptionsApi";
import { applyPayPalSubscriptionEntitlements } from "./applySubscriptionEntitlements";

const PENDING_COLL = "paypal_subscription_pending";
const GRANTS_COLL = "paypal_subscription_grants";

export type PayPalPendingDoc = {
  _id: ObjectId;
  clerkUserId: string;
  stripePriceId: string;
  planDisplayName: string;
  pricingAbLayout?: string | null;
  homeAbVariant?: string | null;
  finalOfferSource?: string | null;
  challengeMode?: string | null;
  challengeTargetClb?: number | null;
  challengeWindowDays?: number | null;
  challengeRefundPercent?: number | null;
  challengeTierKey?: string | null;
  challengeDeadlineAt?: Date | null;
  createdAt: Date;
  consumedAt?: Date;
};

function subscriptionAmountAndCurrency(sub: {
  billing_info?: {
    last_payment?: { amount?: { currency_code?: string; value?: string } };
  };
}): { amount: number; currency: string } {
  const raw = sub.billing_info?.last_payment?.amount?.value;
  const cur = sub.billing_info?.last_payment?.amount?.currency_code || "CAD";
  const n = raw != null ? Number.parseFloat(String(raw)) : 0;
  const amount = Number.isFinite(n) ? n : 0;
  return { amount, currency: cur };
}

async function resolveAmountAndCurrency(
  sub: {
    billing_info?: {
      last_payment?: { amount?: { currency_code?: string; value?: string } };
    };
  },
  stripePriceId: string
): Promise<{ amount: number; currency: string }> {
  const fromPayPal = subscriptionAmountAndCurrency(sub);
  if (fromPayPal.amount > 0) return fromPayPal;

  try {
    const price = await stripe.prices.retrieve(stripePriceId);
    const unitAmount = typeof price.unit_amount === "number" ? price.unit_amount : null;
    if (unitAmount != null && unitAmount > 0) {
      return {
        amount: unitAmount / 100,
        currency: (price.currency || fromPayPal.currency || "CAD").toUpperCase(),
      };
    }
  } catch {
    /* keep fallback below */
  }

  return fromPayPal;
}

function isPgUniqueViolation(e: unknown): boolean {
  return Boolean(
    e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "23505"
  );
}

function isActivePayPalStatus(status: string | undefined): boolean {
  const s = (status || "").toUpperCase();
  return s === "ACTIVE" || s === "APPROVED";
}

export async function finalizePayPalSubscriptionReturn(params: {
  clerkUserId: string;
  subscriptionId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { clerkUserId, subscriptionId } = params;

  if (!subscriptionId || !/^I-[A-Z0-9]+$/i.test(subscriptionId)) {
    return { ok: false, reason: "invalid_subscription" };
  }

  const db = await getDb();
  const grants = db.collection(GRANTS_COLL);
  let grantInserted = false;

  try {
    await grants.insertOne({
      paypalSubscriptionId: subscriptionId,
      clerkUserId,
      createdAt: new Date(),
    });
    grantInserted = true;
  } catch (e) {
    if (isPgUniqueViolation(e)) {
      // Already processed once; continue so we can self-heal metadata if needed.
      grantInserted = false;
    } else {
      throw e;
    }
  }

  try {
    const sub = await getPayPalSubscription(subscriptionId);
    const customId = sub.custom_id?.trim();
    if (!customId || !ObjectId.isValid(customId)) {
      if (grantInserted) {
        await grants.deleteOne({ paypalSubscriptionId: subscriptionId });
      }
      return { ok: false, reason: "missing_custom_id" };
    }

    const pending = (await db
      .collection(PENDING_COLL)
      .findOne({ _id: new ObjectId(customId) })) as PayPalPendingDoc | null;

    if (!pending || pending.clerkUserId !== clerkUserId) {
      if (grantInserted) {
        await grants.deleteOne({ paypalSubscriptionId: subscriptionId });
      }
      return { ok: false, reason: "pending_mismatch" };
    }

    if (!isActivePayPalStatus(sub.status)) {
      if (grantInserted) {
        await grants.deleteOne({ paypalSubscriptionId: subscriptionId });
      }
      return { ok: false, reason: "not_active" };
    }

    const livePayPalPlanId =
      sub.plan_id?.trim() || sub.plan?.id?.trim() || "";
    let planDisplayName = pending.planDisplayName;
    let stripePriceForAmount = pending.stripePriceId;
    if (livePayPalPlanId?.startsWith("P-")) {
      const planDoc = await db.collection("plans").findOne<{
        title?: string;
        planTitle?: string;
        stripePriceId?: string;
      }>(
        { paypalPlanId: livePayPalPlanId },
        { projection: { title: 1, planTitle: 1, stripePriceId: 1 } }
      );
      if (planDoc) {
        const label = planDoc.title?.trim() || planDoc.planTitle?.trim();
        if (label) planDisplayName = label;
        if (planDoc.stripePriceId?.trim()) {
          stripePriceForAmount = planDoc.stripePriceId.trim();
        }
      }
    }

    const { amount, currency } = await resolveAmountAndCurrency(sub, stripePriceForAmount);
    const renews = sub.billing_info?.next_billing_time?.trim() || null;

    await applyPayPalSubscriptionEntitlements({
      userId: clerkUserId,
      planDisplayName,
      purchaseAmount: amount,
      purchaseCurrency: currency,
      planRenewsAtIso: renews,
    });

    await db.collection(PENDING_COLL).updateOne(
      { _id: pending._id },
      { $set: { consumedAt: new Date(), paypalSubscriptionId: subscriptionId } }
    );

    const amountTotalCents = Math.round(amount * 100);

    try {
      await ActivityLogger.paymentSuccessful(amountTotalCents, currency.toUpperCase(), {
        paypalSubscriptionId: subscriptionId,
        provider: "paypal",
      });
    } catch (logErr) {
      logger.error("PayPal payment activity log failed", {
        component: "paypal_subscriptions",
        action: "activity_log",
        metadata: { error: logErr },
      });
    }

    const layoutRaw = pending.pricingAbLayout;
    if (
      typeof layoutRaw === "string" &&
      isPricingAbLayout(layoutRaw) &&
      clerkUserId
    ) {
      try {
        await db.collection("pricing_ab_events").insertOne({
          eventType: "purchase",
          layout: layoutRaw,
          userId: clerkUserId,
          sessionId: null,
          amountTotal: amountTotalCents,
          planName: planDisplayName,
          purchasePage: "/pricing",
          createdAt: new Date(),
        });
      } catch (abErr) {
        logger.error("pricing_ab PayPal purchase log failed", {
          component: "paypal_subscriptions",
          metadata: { error: abErr },
        });
      }
    }

    const homeRaw = pending.homeAbVariant;
    if (
      typeof homeRaw === "string" &&
      isHomeAbVariant(homeRaw) &&
      isHomeAbExperimentVariant(homeRaw) &&
      clerkUserId
    ) {
      try {
        await db.collection("home_ab_events").insertOne({
          eventType: "purchase",
          variant: homeRaw,
          userId: clerkUserId,
          sessionId: null,
          amountTotal: amountTotalCents,
          planName: planDisplayName,
          purchasePage: "/pricing",
          createdAt: new Date(),
        });
      } catch (abErr) {
        logger.error("home_ab PayPal purchase log failed", {
          component: "paypal_subscriptions",
          metadata: { error: abErr },
        });
      }
    }

    return { ok: true };
  } catch (err) {
    captureException(err, {
      component: "paypal_subscriptions",
      action: "finalize_error",
      userId: clerkUserId,
      metadata: { subscriptionId },
    });
    try {
      if (grantInserted) {
        await grants.deleteOne({ paypalSubscriptionId: subscriptionId });
      }
    } catch {
      /* ignore */
    }
    return { ok: false, reason: "server_error" };
  }
}

export async function ensurePayPalGrantsIndex(): Promise<void> {
  const db = await getDb();
  await db
    .collection(GRANTS_COLL)
    .createIndex({ paypalSubscriptionId: 1 }, { unique: true });
}
