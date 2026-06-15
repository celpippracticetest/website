import { attachStripePricingToSerializedPlans } from "@/lib/loadActivePlansWithStripePrices";
import { getSerializedPlansFromConfig } from "@/lib/pricingPlansConfig";
import type { SerializedPlan } from "@/types/pricing";

const PRICING_CATALOG_TIMEOUT_MS = 900;

async function withPricingCatalogTimeout(
  work: Promise<SerializedPlan[]>,
  fallback: SerializedPlan[]
): Promise<SerializedPlan[]> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const guardedWork = work.catch((error) => {
    console.error("Failed to attach live Stripe prices to pricing catalog:", error);
    return fallback;
  });

  try {
    return await Promise.race([
      guardedWork,
      new Promise<SerializedPlan[]>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), PRICING_CATALOG_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

/** Active Plus plans from `src/config/pricing-plans.json` + live Stripe recurring amounts. */
export async function getActivePlansCatalog(): Promise<SerializedPlan[]> {
  const serializedPlans = getSerializedPlansFromConfig();
  return withPricingCatalogTimeout(
    attachStripePricingToSerializedPlans(serializedPlans),
    serializedPlans
  );
}
