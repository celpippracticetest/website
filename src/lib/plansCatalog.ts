import { attachStripePricingToSerializedPlans } from "@/lib/loadActivePlansWithStripePrices";
import mongoClient from "@/lib/mongodb";
import { isPremiumPlusPlan } from "@/lib/pricing";
import { PlansRepository } from "@/repositories/plans.repo";
import type { SerializedPlan } from "@/types/pricing";

function serializePlan(plan: {
  _id?: unknown;
  title: string;
  type: string;
  planTitle: string;
  oldPrice: string;
  price: string;
  discount: string;
  buttonTitle: string;
  features: string[];
  billingInterval?: "day" | "week" | "month" | "year";
  billingIntervalCount?: number;
  stripePriceId?: string;
  iconType?: string;
  iconWrapperColor?: string;
  order?: number;
}): SerializedPlan {
  const id = plan._id;
  const idStr =
    typeof id === "string" ? id : (id as { toString?: () => string })?.toString?.();
  return {
    _id: idStr ?? undefined,
    title: plan.title,
    type: plan.type,
    planTitle: plan.planTitle,
    oldPrice: plan.oldPrice,
    price: plan.price,
    discount: plan.discount,
    buttonTitle: plan.buttonTitle,
    features: Array.isArray(plan.features) ? plan.features : [],
    billingInterval: plan.billingInterval,
    billingIntervalCount: plan.billingIntervalCount,
    stripePriceId: plan.stripePriceId,
    iconType: plan.iconType as SerializedPlan["iconType"],
    iconWrapperColor: plan.iconWrapperColor,
    order: plan.order,
  };
}

export type GetActivePlansCatalogOptions = {
  /** When true, only rows that match {@link isPremiumPlusPlan} (Plus tier / mock exams / naming heuristics). */
  plusOnly?: boolean;
};

/** Active plans from `app_documents` + live Stripe recurring amounts (same as `/pricing`). */
export async function getActivePlansCatalog(
  options: GetActivePlansCatalogOptions = {}
): Promise<SerializedPlan[]> {
  const db = await mongoClient.db();
  const plansRepo = new PlansRepository(db);
  const plans = await plansRepo.getActivePlans();
  const serializedPlans = plans.map(serializePlan);
  const withStripe = await attachStripePricingToSerializedPlans(serializedPlans);
  if (!options.plusOnly) return withStripe;
  return withStripe.filter(isPremiumPlusPlan);
}
