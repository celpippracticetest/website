import "server-only";

import { ObjectId } from "bson";
import type Stripe from "stripe";
import { getDb } from "@/lib/appDocumentsClient";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { getAccessTierKey } from "@/lib/pricing";
import { toSerializedPlan } from "@/lib/planSerialization";
import {
  emailsFromAuthUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { stripe } from "@/lib/stripe";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";
import { findUserProfileForAdminLookup } from "@/lib/users/userProfilesPg";
import type { Plan } from "@/models/plans.model";

export type AdminPlanChangeTiming = "immediate" | "period_end";

export type AdminPlanChangeTarget =
  | { kind: "free" }
  | { kind: "plan"; planId: string };

export type AdminPlanChangeInput = {
  userId: string;
  target: AdminPlanChangeTarget;
  timing: AdminPlanChangeTiming;
  refundLatestPayment: boolean;
  adminUserId?: string | null;
};

export type LastPaymentPreview =
  | {
      available: true;
      chargeId: string;
      amountCents: number;
      currency: string;
      amountDisplay: string;
      paidAtIso: string;
    }
  | { available: false; message: string };

export type AdminPlanChangeResult = {
  success: true;
  message: string;
  timing: AdminPlanChangeTiming;
  targetPlan: string;
  targetPlanType: string | null;
  stripeSubscriptionId: string | null;
  refund: { refundId: string; amountDisplay: string } | null;
  effectiveAt: string | null;
};

function subscriptionCurrentPeriodEndUnix(
  sub: Stripe.Subscription
): number | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  return end != null ? end : null;
}

function priceIdFromItem(
  item: Stripe.SubscriptionItem | undefined
): string | null {
  const priceRaw = item?.price;
  if (!priceRaw) return null;
  if (typeof priceRaw === "string") return priceRaw;
  return priceRaw.id ?? null;
}

function scheduleIdFromSubscription(
  sub: Stripe.Subscription
): string | null {
  const raw = sub.schedule;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.id;
}

function formatMoney(amountCents: number, currency: string): string {
  return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function pickLatestRefundableCharge(
  charges: Stripe.Charge[]
): Stripe.Charge | null {
  for (const c of charges) {
    if (!c.paid || c.status !== "succeeded") continue;
    if (c.dispute) continue;
    const remaining = c.amount - (c.amount_refunded || 0);
    if (remaining <= 0) continue;
    return c;
  }
  return null;
}

async function listBillableSubscriptions(
  customerId: string
): Promise<Stripe.Subscription[]> {
  const [active, trialing] = await Promise.all([
    stripe.subscriptions.list({ customer: customerId, status: "active", limit: 20 }),
    stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 20,
    }),
  ]);
  return [...active.data, ...trialing.data];
}

async function releaseSubscriptionScheduleIfAny(
  subscription: Stripe.Subscription
): Promise<void> {
  const scheduleId = scheduleIdFromSubscription(subscription);
  if (!scheduleId) return;
  try {
    await stripe.subscriptionSchedules.release(scheduleId);
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code !== "resource_missing") throw err;
  }
}

export async function getLastPaymentPreviewForCustomer(
  customerId: string
): Promise<LastPaymentPreview> {
  try {
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 10,
    });
    const last = pickLatestRefundableCharge(charges.data);
    if (!last) {
      return {
        available: false,
        message: "No refundable payment found for this customer.",
      };
    }
    const amountCents = last.amount - (last.amount_refunded || 0);
    return {
      available: true,
      chargeId: last.id,
      amountCents,
      currency: last.currency,
      amountDisplay: formatMoney(amountCents, last.currency),
      paidAtIso: new Date(last.created * 1000).toISOString(),
    };
  } catch (err) {
    return {
      available: false,
      message: err instanceof Error ? err.message : "Stripe error",
    };
  }
}

async function refundLatestPaymentKeepingSubscription(params: {
  customerId: string;
  adminUserId?: string | null;
  targetUserId: string;
}): Promise<{ refundId: string; amountDisplay: string }> {
  const preview = await getLastPaymentPreviewForCustomer(params.customerId);
  if (!preview.available) {
    throw new Error(preview.message);
  }

  const refund = await stripe.refunds.create({
    charge: preview.chargeId,
    amount: preview.amountCents,
    reason: "requested_by_customer",
    metadata: {
      admin_plan_change: "true",
      admin_skip_subscription_cancel: "true",
      target_user_id: params.targetUserId,
      admin_user_id: params.adminUserId || "",
    },
  });

  return {
    refundId: refund.id,
    amountDisplay: preview.amountDisplay,
  };
}

async function resolveAuthUserId(identifier: string): Promise<{
  authUserId: string;
  email: string | null;
  stripeCustomerIdFromProfile: string | null;
}> {
  const profile = await findUserProfileForAdminLookup(identifier);
  if (!profile) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }

  const authUserId =
    profile.supabase_auth_user_id?.trim() ||
    profile.legacy_clerk_user_id?.trim() ||
    identifier;

  return {
    authUserId,
    email: profile.email,
    stripeCustomerIdFromProfile: profile.stripe_customer_id,
  };
}

async function loadTargetPlan(planId: string): Promise<Plan> {
  const db = await getDb();
  if (!ObjectId.isValid(planId)) {
    throw Object.assign(new Error("Invalid plan id"), { status: 400 });
  }
  const doc = await db.collection("plans").findOne({
    _id: new ObjectId(planId),
  });
  if (!doc) {
    throw Object.assign(new Error("Plan not found"), { status: 404 });
  }
  const plan = doc as unknown as Plan;
  if (!plan.stripePriceId?.trim()) {
    throw Object.assign(
      new Error("Selected plan has no Stripe price linked"),
      { status: 422 }
    );
  }
  return plan;
}

function entitlementFromPlan(plan: Plan): {
  plan: string;
  planType: string;
} {
  const serialized = toSerializedPlan(plan);
  const tier = getAccessTierKey(serialized);
  if (tier === "premiumPlus" || tier === "premium") {
    return { plan: "plus", planType: plan.title };
  }
  return { plan: "plus", planType: plan.title };
}

async function schedulePaidPlanAtPeriodEnd(
  subscription: Stripe.Subscription,
  newPriceId: string
): Promise<void> {
  const periodEnd = subscriptionCurrentPeriodEndUnix(subscription);
  if (!periodEnd) {
    throw new Error("Subscription has no current period end");
  }

  if (subscription.cancel_at_period_end) {
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });
  }

  let schedule: Stripe.SubscriptionSchedule;
  const existingScheduleId = scheduleIdFromSubscription(subscription);
  if (existingScheduleId) {
    schedule = await stripe.subscriptionSchedules.retrieve(existingScheduleId);
  } else {
    schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    });
  }

  const currentPhase = schedule.phases[0];
  if (!currentPhase) {
    throw new Error("Subscription schedule has no current phase");
  }

  const currentPrice =
    typeof currentPhase.items[0]?.price === "string"
      ? currentPhase.items[0].price
      : currentPhase.items[0]?.price?.id;

  if (!currentPrice) {
    throw new Error("Could not resolve current subscription price");
  }

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        items: [
          {
            price: currentPrice,
            quantity: currentPhase.items[0]?.quantity || 1,
          },
        ],
        start_date: currentPhase.start_date,
        end_date: periodEnd,
      },
      {
        items: [{ price: newPriceId, quantity: 1 }],
      },
    ],
  });
}

/**
 * CSM admin: change a user's plan in Stripe (and sync app entitlements).
 */
export async function adminChangeUserPlan(
  input: AdminPlanChangeInput
): Promise<AdminPlanChangeResult> {
  const { authUserId, email, stripeCustomerIdFromProfile } =
    await resolveAuthUserId(input.userId);

  const authAdmin = await appUserAdmin();
  let authUser: Awaited<ReturnType<typeof authAdmin.users.getUser>> | null =
    null;
  try {
    authUser = await authAdmin.users.getUser(authUserId);
  } catch {
    try {
      authUser = await authAdmin.users.getUser(input.userId);
    } catch {
      authUser = null;
    }
  }

  const emails = authUser
    ? emailsFromAuthUser(authUser)
    : email
      ? [email]
      : [];

  const customerId = await resolveStripeCustomerId(authUserId, {
    stripeCustomerIdFromPrivate:
      (authUser?.privateMetadata?.stripeCustomerId as string | undefined) ||
      stripeCustomerIdFromProfile,
    emails,
  });

  let refundResult: { refundId: string; amountDisplay: string } | null = null;
  if (input.refundLatestPayment) {
    if (!customerId) {
      throw Object.assign(
        new Error("Cannot refund: Stripe customer not found"),
        { status: 422 }
      );
    }
    refundResult = await refundLatestPaymentKeepingSubscription({
      customerId,
      adminUserId: input.adminUserId,
      targetUserId: authUserId,
    });
  }

  if (input.target.kind === "free") {
    return changeToFree({
      authUserId,
      customerId,
      timing: input.timing,
      refund: refundResult,
    });
  }

  const targetPlan = await loadTargetPlan(input.target.planId);
  const entitlement = entitlementFromPlan(targetPlan);
  const stripePriceId = targetPlan.stripePriceId!.trim();

  if (!customerId) {
    throw Object.assign(
      new Error(
        "Stripe customer not found. User must have an existing subscription to change plan."
      ),
      { status: 422 }
    );
  }

  const subscriptions = await listBillableSubscriptions(customerId);
  if (subscriptions.length === 0) {
    throw Object.assign(
      new Error(
        "No active Stripe subscription. Use checkout to upgrade users without a subscription."
      ),
      { status: 422 }
    );
  }

  const subscription = subscriptions[0];
  const item = subscription.items.data[0];
  if (!item) {
    throw Object.assign(new Error("Subscription has no items"), {
      status: 422,
    });
  }

  const currentPriceId = priceIdFromItem(item);
  if (currentPriceId === stripePriceId && input.timing === "immediate") {
    await syncUserPlanPublicMetadata(authUserId, {
      plan: entitlement.plan,
      planType: entitlement.planType,
      planCancelled: false,
      planExpiresAt: null,
      planRenewsAt: (() => {
        const end = subscriptionCurrentPeriodEndUnix(subscription);
        return end ? new Date(end * 1000).toISOString() : null;
      })(),
    });
    return {
      success: true,
      message: "User is already on this Stripe price; entitlements refreshed.",
      timing: input.timing,
      targetPlan: entitlement.plan,
      targetPlanType: entitlement.planType,
      stripeSubscriptionId: subscription.id,
      refund: refundResult,
      effectiveAt: new Date().toISOString(),
    };
  }

  if (input.timing === "immediate") {
    await releaseSubscriptionScheduleIfAny(subscription);
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
      items: [{ id: item.id, price: stripePriceId }],
      proration_behavior: "none",
      metadata: {
        ...subscription.metadata,
        user_id: subscription.metadata?.user_id || authUserId,
        plan_name: entitlement.planType,
        admin_plan_change: "true",
      },
    });

    const refreshed = await stripe.subscriptions.retrieve(subscription.id);
    const periodEnd = subscriptionCurrentPeriodEndUnix(refreshed);

    await syncUserPlanPublicMetadata(authUserId, {
      plan: entitlement.plan,
      planType: entitlement.planType,
      planCancelled: false,
      planExpiresAt: null,
      planRenewsAt: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    });

    return {
      success: true,
      message: `Plan changed immediately to ${entitlement.planType}.`,
      timing: "immediate",
      targetPlan: entitlement.plan,
      targetPlanType: entitlement.planType,
      stripeSubscriptionId: subscription.id,
      refund: refundResult,
      effectiveAt: new Date().toISOString(),
    };
  }

  await schedulePaidPlanAtPeriodEnd(subscription, stripePriceId);
  const periodEnd = subscriptionCurrentPeriodEndUnix(subscription);
  const effectiveAt = periodEnd
    ? new Date(periodEnd * 1000).toISOString()
    : null;

  await syncUserPlanPublicMetadata(authUserId, {
    planCancelled: false,
    planExpiresAt: null,
    planRenewsAt: effectiveAt,
  });

  return {
    success: true,
    message: `Plan will change to ${entitlement.planType} at period end.`,
    timing: "period_end",
    targetPlan: entitlement.plan,
    targetPlanType: entitlement.planType,
    stripeSubscriptionId: subscription.id,
    refund: refundResult,
    effectiveAt,
  };
}

async function changeToFree(params: {
  authUserId: string;
  customerId: string | null;
  timing: AdminPlanChangeTiming;
  refund: { refundId: string; amountDisplay: string } | null;
}): Promise<AdminPlanChangeResult> {
  const { authUserId, customerId, timing, refund } = params;

  if (!customerId) {
    if (timing === "period_end") {
      throw Object.assign(
        new Error(
          "No Stripe customer — cannot schedule free at period end. Use immediate."
        ),
        { status: 422 }
      );
    }
    await syncUserPlanPublicMetadata(authUserId, {
      plan: "free",
      planType: "",
      planCancelled: false,
      planExpiresAt: null,
      planRenewsAt: null,
    });
    return {
      success: true,
      message: "User set to free (no Stripe subscription).",
      timing: "immediate",
      targetPlan: "free",
      targetPlanType: null,
      stripeSubscriptionId: null,
      refund,
      effectiveAt: new Date().toISOString(),
    };
  }

  const subscriptions = await listBillableSubscriptions(customerId);

  if (subscriptions.length === 0) {
    if (timing === "period_end") {
      throw Object.assign(
        new Error("No active subscription to cancel at period end."),
        { status: 422 }
      );
    }
    await syncUserPlanPublicMetadata(authUserId, {
      plan: "free",
      planType: "",
      planCancelled: false,
      planExpiresAt: null,
      planRenewsAt: null,
    });
    return {
      success: true,
      message: "User set to free (no active Stripe subscription).",
      timing: "immediate",
      targetPlan: "free",
      targetPlanType: null,
      stripeSubscriptionId: null,
      refund,
      effectiveAt: new Date().toISOString(),
    };
  }

  let lastSubId: string | null = null;
  let periodEndIso: string | null = null;

  for (const sub of subscriptions) {
    lastSubId = sub.id;
    const periodEnd = subscriptionCurrentPeriodEndUnix(sub);
    if (periodEnd) {
      periodEndIso = new Date(periodEnd * 1000).toISOString();
    }

    if (timing === "immediate") {
      await releaseSubscriptionScheduleIfAny(sub);
      await stripe.subscriptions.cancel(sub.id, { prorate: false });
    } else {
      await releaseSubscriptionScheduleIfAny(sub);
      await stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: true,
        metadata: {
          ...sub.metadata,
          user_id: sub.metadata?.user_id || authUserId,
          admin_plan_change: "true",
        },
      });
    }
  }

  if (timing === "immediate") {
    await syncUserPlanPublicMetadata(authUserId, {
      plan: "free",
      planType: "",
      planCancelled: false,
      planExpiresAt: null,
      planRenewsAt: null,
    });
    return {
      success: true,
      message: "Subscription canceled; user set to free immediately.",
      timing: "immediate",
      targetPlan: "free",
      targetPlanType: null,
      stripeSubscriptionId: lastSubId,
      refund,
      effectiveAt: new Date().toISOString(),
    };
  }

  await syncUserPlanPublicMetadata(authUserId, {
    planCancelled: true,
    planExpiresAt: periodEndIso,
    planRenewsAt: null,
  });

  return {
    success: true,
    message: "Subscription set to cancel at period end (then free).",
    timing: "period_end",
    targetPlan: "free",
    targetPlanType: null,
    stripeSubscriptionId: lastSubId,
    refund,
    effectiveAt: periodEndIso,
  };
}

export async function getAdminPlanChangeContext(userId: string): Promise<{
  userId: string;
  email: string | null;
  stripeCustomerId: string | null;
  hasActiveSubscription: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  lastPayment: LastPaymentPreview;
  plans: Array<{
    id: string;
    title: string;
    planTitle: string;
    price: string;
    stripePriceId: string | null;
    isActive: boolean;
  }>;
}> {
  const { authUserId, email, stripeCustomerIdFromProfile } =
    await resolveAuthUserId(userId);

  const authAdmin = await appUserAdmin();
  let authUser: Awaited<ReturnType<typeof authAdmin.users.getUser>> | null =
    null;
  try {
    authUser = await authAdmin.users.getUser(authUserId);
  } catch {
    authUser = null;
  }

  const emails = authUser
    ? emailsFromAuthUser(authUser)
    : email
      ? [email]
      : [];

  const customerId = await resolveStripeCustomerId(authUserId, {
    stripeCustomerIdFromPrivate:
      (authUser?.privateMetadata?.stripeCustomerId as string | undefined) ||
      stripeCustomerIdFromProfile,
    emails,
  });

  let hasActiveSubscription = false;
  let currentPeriodEnd: string | null = null;
  let cancelAtPeriodEnd = false;

  if (customerId) {
    const subs = await listBillableSubscriptions(customerId);
    hasActiveSubscription = subs.length > 0;
    if (subs[0]) {
      cancelAtPeriodEnd = Boolean(subs[0].cancel_at_period_end);
      const end = subscriptionCurrentPeriodEndUnix(subs[0]);
      currentPeriodEnd = end ? new Date(end * 1000).toISOString() : null;
    }
  }

  const lastPayment = customerId
    ? await getLastPaymentPreviewForCustomer(customerId)
    : {
        available: false as const,
        message: "No Stripe customer on file.",
      };

  const db = await getDb();
  const planDocs = await db
    .collection("plans")
    .find({})
    .sort({ order: 1 })
    .toArray();

  const plans = planDocs.map((doc) => {
    const p = doc as unknown as Plan & { _id: ObjectId };
    return {
      id: String(p._id),
      title: p.title,
      planTitle: p.planTitle,
      price: p.price,
      stripePriceId: p.stripePriceId?.trim() || null,
      isActive: Boolean(p.isActive),
    };
  });

  return {
    userId: authUserId,
    email,
    stripeCustomerId: customerId,
    hasActiveSubscription,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    lastPayment,
    plans,
  };
}
