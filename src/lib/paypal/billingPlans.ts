import type { Plan, PlanBillingInterval } from "@/models/plans.model";
import { getPlanRecurringConfig } from "@/lib/planBilling";
import { getDb } from "@/lib/mongodb";
import { payPalCatalogProductExistsOnCurrentApi, paypalApiJson } from "./subscriptionsApi";

function parsePriceToCadDecimalString(price: string | undefined): string {
  const numericValue = Number.parseFloat(String(price ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new Error("Plan price must be a positive number for PayPal");
  }
  return numericValue.toFixed(2);
}

function toPayPalIntervalUnit(
  interval: PlanBillingInterval
): "DAY" | "WEEK" | "MONTH" | "YEAR" {
  const map: Record<PlanBillingInterval, "DAY" | "WEEK" | "MONTH" | "YEAR"> = {
    day: "DAY",
    week: "WEEK",
    month: "MONTH",
    year: "YEAR",
  };
  return map[interval];
}

function buildPlanName(plan: Pick<Plan, "title" | "planTitle">): string {
  const t = plan.title?.trim() || plan.planTitle?.trim() || "CELPIP subscription";
  return t.slice(0, 127);
}

async function resolveSharedPayPalProductIdFromDb(): Promise<string | null> {
  try {
    const db = await getDb();
    const docs = await db
      .collection("plans")
      .find<{ paypalProductId?: string }>(
        { paypalProductId: { $exists: true, $type: "string" } },
        { projection: { paypalProductId: 1 }, sort: { updatedAt: -1 }, limit: 80 }
      )
      .toArray();
    const seen = new Set<string>();
    for (const doc of docs) {
      const candidate = doc.paypalProductId?.trim();
      if (!candidate?.startsWith("PROD-") || seen.has(candidate)) continue;
      seen.add(candidate);
      if (await payPalCatalogProductExistsOnCurrentApi(candidate)) {
        return candidate;
      }
    }
  } catch {
    /* ignore DB lookup and create a new shared product below */
  }
  return null;
}

async function resolveSharedPayPalProductId(): Promise<string> {
  const fromEnv = process.env.PAYPAL_SHARED_PRODUCT_ID?.trim();
  if (fromEnv?.startsWith("PROD-") && (await payPalCatalogProductExistsOnCurrentApi(fromEnv))) {
    return fromEnv;
  }

  const fromDb = await resolveSharedPayPalProductIdFromDb();
  if (fromDb) return fromDb;

  const product = await paypalApiJson<{ id: string }>("/v1/catalogs/products", {
    method: "POST",
    idempotencyKey:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `prod-${Date.now()}`,
    body: JSON.stringify({
      name: "CELPIP Subscriptions",
      description: "Shared product for all CELPIP subscription plans",
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });
  if (!product?.id?.startsWith("PROD-")) {
    throw new Error("PayPal did not return a shared product id");
  }
  return product.id;
}

/** Same shared-product resolution as PayPal billing plan creation (CMS + env + DB + create). */
export async function resolveOrCreateSharedPayPalCatalogProductId(): Promise<string> {
  return resolveSharedPayPalProductId();
}

/**
 * Creates a PayPal catalog product and an ACTIVE billing plan (P-…) matching the CMS plan
 * price and billing cadence (aligned with Stripe recurring).
 */
export async function createPayPalProductAndBillingPlan(plan: Plan): Promise<{
  paypalProductId: string;
  paypalPlanId: string;
}> {
  const recurring = getPlanRecurringConfig(plan);
  const value = parsePriceToCadDecimalString(plan.price);
  const name = buildPlanName(plan);
  const description = `${name} — billed every ${recurring.interval_count} ${recurring.interval}(s)`.slice(
    0,
    127
  );
  const sharedProductId = await resolveSharedPayPalProductId();

  const billingCycles = [
    {
      frequency: {
        interval_unit: toPayPalIntervalUnit(recurring.interval),
        interval_count: recurring.interval_count,
      },
      tenure_type: "REGULAR" as const,
      sequence: 1,
      total_cycles: 0,
      pricing_scheme: {
        version: 1,
        fixed_price: {
          value,
          currency_code: "CAD",
        },
      },
    },
  ];

  const planBody = {
    product_id: sharedProductId,
    name,
    description,
    status: "ACTIVE",
    billing_cycles: billingCycles,
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3,
    },
  };

  const billingPlan = await paypalApiJson<{ id: string }>("/v1/billing/plans", {
    method: "POST",
    idempotencyKey:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `plan-${Date.now()}`,
    body: JSON.stringify(planBody),
  });

  if (!billingPlan?.id?.startsWith("P-")) {
    throw new Error("PayPal did not return a billing plan id");
  }

  return { paypalProductId: sharedProductId, paypalPlanId: billingPlan.id };
}

/** Minimal shape from GET /v1/billing/plans/{id} for upgrade promos. */
export type PayPalBillingPlanFrequency = {
  interval_unit: "DAY" | "WEEK" | "MONTH" | "MONTH" | "YEAR";
  interval_count: number;
};

export type FetchedPayPalBillingPlan = {
  product_id?: string;
  name?: string;
  billing_cycles?: Array<{
    tenure_type?: string;
    sequence?: number;
    frequency?: PayPalBillingPlanFrequency;
  }>;
};

export async function fetchPayPalBillingPlan(
  planId: string
): Promise<FetchedPayPalBillingPlan> {
  const enc = encodeURIComponent(planId.trim());
  return paypalApiJson<FetchedPayPalBillingPlan>(`/v1/billing/plans/${enc}`, {
    method: "GET",
  });
}

function frequencyFromPayPalPlan(plan: FetchedPayPalBillingPlan): PayPalBillingPlanFrequency | null {
  const cycles = plan.billing_cycles;
  if (!cycles?.length) return null;
  const regular = cycles.find((c) => c.tenure_type === "REGULAR");
  const ref = regular ?? cycles[0];
  const u = ref.frequency?.interval_unit;
  const n = ref.frequency?.interval_count;
  if (!u || typeof n !== "number" || n < 1) return null;
  return { interval_unit: u, interval_count: n };
}

/**
 * One paid TRIAL cycle (promo first period) + REGULAR at list price.
 * PayPal single-REGULAR catalog plans cannot express a discounted first period via revise alone.
 */
export async function createPayPalPromoUpgradeBillingPlan(params: {
  productId: string;
  frequency: PayPalBillingPlanFrequency;
  promoFirstPeriodValue: string;
  regularValue: string;
  currencyCode: string;
  nameHint: string;
}): Promise<string> {
  const cc = params.currencyCode.toUpperCase();
  const name = params.nameHint.trim().slice(0, 127) || "Upgrade promo";
  const description = "Promotional first period, then regular billing".slice(0, 127);

  const billingCycles = [
    {
      frequency: params.frequency,
      tenure_type: "TRIAL" as const,
      sequence: 1,
      total_cycles: 1,
      pricing_scheme: {
        version: 1,
        fixed_price: {
          value: params.promoFirstPeriodValue,
          currency_code: cc,
        },
      },
    },
    {
      frequency: params.frequency,
      tenure_type: "REGULAR" as const,
      sequence: 2,
      total_cycles: 0,
      pricing_scheme: {
        version: 1,
        fixed_price: {
          value: params.regularValue,
          currency_code: cc,
        },
      },
    },
  ];

  const planBody = {
    product_id: params.productId,
    name,
    description,
    status: "ACTIVE",
    billing_cycles: billingCycles,
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3,
    },
  };

  const billingPlan = await paypalApiJson<{ id: string }>("/v1/billing/plans", {
    method: "POST",
    idempotencyKey:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `promo-plan-${Date.now()}`,
    body: JSON.stringify(planBody),
  });

  if (!billingPlan?.id?.startsWith("P-")) {
    throw new Error("PayPal did not return a promotional billing plan id");
  }
  return billingPlan.id;
}

/**
 * Resolves product + cadence from an existing catalog plan and creates a short-lived P- plan
 * that charges {@link promoFirstPeriodCents} once, then {@link regularUnitCents} per cycle.
 */
export async function resolveOrCreatePayPalPromoUpgradePlanId(params: {
  basePayPalPlanId: string;
  promoFirstPeriodCents: number;
  regularUnitCents: number;
  currency: string;
  nameHint: string;
}): Promise<string> {
  const fetched = await fetchPayPalBillingPlan(params.basePayPalPlanId);
  const productId = fetched.product_id?.trim();
  const frequency = frequencyFromPayPalPlan(fetched);
  if (!productId?.startsWith("PROD-") || !frequency) {
    throw new Error("Could not read PayPal catalog plan for promo upgrade");
  }
  const promoFirstPeriodValue = (params.promoFirstPeriodCents / 100).toFixed(2);
  const regularValue = (params.regularUnitCents / 100).toFixed(2);
  return createPayPalPromoUpgradeBillingPlan({
    productId,
    frequency,
    promoFirstPeriodValue,
    regularValue,
    currencyCode: params.currency,
    nameHint: params.nameHint,
  });
}
