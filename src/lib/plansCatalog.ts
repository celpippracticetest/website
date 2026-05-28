import { attachStripePricingToSerializedPlans } from "@/lib/loadActivePlansWithStripePrices";
import { getSerializedPlansFromConfig } from "@/lib/pricingPlansConfig";
import type { SerializedPlan } from "@/types/pricing";

/** Active Plus plans from `src/config/pricing-plans.json` + live Stripe recurring amounts. */
export async function getActivePlansCatalog(): Promise<SerializedPlan[]> {
  const serializedPlans = getSerializedPlansFromConfig();
  return attachStripePricingToSerializedPlans(serializedPlans);
}
