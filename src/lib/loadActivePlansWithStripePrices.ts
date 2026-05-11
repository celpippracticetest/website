import type { CompatDb as Db } from "@/lib/pg/types";
import { stripe } from "@/lib/stripe";
import type { Plan } from "@/models/plans.model";
import { PlansRepository } from "@/repositories/plans.repo";
import type { PlanBillingInterval, SerializedPlan } from "@/types/pricing";

/**
 * Same catalog + ordering as the marketing pricing page (`PlansRepository.getActivePlans`,
 * sorted by `order`), with amounts and billing interval loaded from Stripe for each
 * `stripePriceId` — same source as checkout (`stripe.prices.retrieve`).
 */
export type SubscriptionPlanFromStripe = {
  /** Stripe Price id (`price_…`) — mobile `plan.id` for catalog / checkout. */
  id: string;
  name: string;
  priceId: string;
  /** Stripe Product id (`prod_…`) when resolvable — for mobile IAP env maps. */
  stripeProductId?: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  order: number;
};

function displayNameForPlan(plan: Plan): string {
  const parts = [plan.title?.trim(), plan.planTitle?.trim(), plan.type?.trim()].filter(
    (p): p is string => Boolean(p)
  );
  const unique = [...new Set(parts)];
  return unique.join(" · ") || "Plan";
}

export async function loadActivePlansWithStripePrices(
  db: Db
): Promise<SubscriptionPlanFromStripe[]> {
  const repo = new PlansRepository(db);
  const activePlans = await repo.getActivePlans();

  const ordered = [...activePlans].sort((left, right) => {
    const lo = left.order ?? Number.MAX_SAFE_INTEGER;
    const ro = right.order ?? Number.MAX_SAFE_INTEGER;
    return lo - ro;
  });

  const withStripePrice = ordered.filter(
    (p): p is Plan & { stripePriceId: string } => Boolean(p.stripePriceId?.trim())
  );

  const resolved = (
    await Promise.all(
      withStripePrice.map(async (plan) => {
        try {
          const price = await stripe.prices.retrieve(plan.stripePriceId.trim(), {
            expand: ["product"],
          });

          if (!price.active || !price.recurring) {
            return null;
          }

          let stripeProductId: string | undefined =
            typeof plan.stripeProductId === "string" && plan.stripeProductId.trim()
              ? plan.stripeProductId.trim()
              : undefined;
          if (!stripeProductId && price.product) {
            const prod = price.product;
            if (typeof prod !== "string" && prod && !("deleted" in prod && prod.deleted === true)) {
              stripeProductId = prod.id;
            }
          }

          return {
            id: price.id,
            name: displayNameForPlan(plan),
            priceId: price.id,
            ...(stripeProductId ? { stripeProductId } : {}),
            amount: price.unit_amount != null ? price.unit_amount / 100 : 0,
            currency: price.currency,
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count ?? 1,
            order: plan.order ?? Number.MAX_SAFE_INTEGER,
          } satisfies SubscriptionPlanFromStripe;
        } catch (err) {
          console.error(`Error fetching Stripe price ${plan.stripePriceId}:`, err);
          return null;
        }
      })
    )
  ).filter((p): p is SubscriptionPlanFromStripe => p != null);

  const seen = new Set<string>();
  return resolved.filter((p) => {
    if (seen.has(p.priceId)) return false;
    seen.add(p.priceId);
    return true;
  });
}

function recurringToBilling(
  interval: string | undefined,
  intervalCount: number | null | undefined
): { billingInterval: PlanBillingInterval; billingIntervalCount: number } | null {
  if (!interval || interval === "day") {
    return null;
  }
  const count = intervalCount && intervalCount > 0 ? intervalCount : 1;
  return {
    billingInterval: interval as PlanBillingInterval,
    billingIntervalCount: count,
  };
}

/**
 * Overlays live Stripe recurring unit amounts (and billing fields) onto the same
 * `SerializedPlan[]` built for `/pricing`, so the page matches checkout.
 */
export async function attachStripePricingToSerializedPlans(
  plans: SerializedPlan[]
): Promise<SerializedPlan[]> {
  return Promise.all(
    plans.map(async (plan) => {
      const priceId = plan.stripePriceId?.trim();
      if (!priceId) return plan;
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (!price.active || !price.recurring || price.unit_amount == null) {
          return plan;
        }
        const amount = price.unit_amount / 100;
        const priceStr = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
        const billing = recurringToBilling(
          price.recurring.interval,
          price.recurring.interval_count
        );
        return {
          ...plan,
          price: priceStr,
          ...(billing
            ? { billingInterval: billing.billingInterval, billingIntervalCount: billing.billingIntervalCount }
            : {}),
        };
      } catch (err) {
        console.error(`attachStripePricingToSerializedPlans: ${priceId}`, err);
        return plan;
      }
    })
  );
}
