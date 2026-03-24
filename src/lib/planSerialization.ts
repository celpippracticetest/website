import type { Plan } from "@/models/plans.model";
import type { SerializedPlan } from "@/types/pricing";

export function toSerializedPlan(plan: Partial<Plan>): SerializedPlan {
  return {
    _id: plan._id?.toString(),
    title: plan.title || "",
    type: plan.type || "",
    planTitle: plan.planTitle || "",
    oldPrice: plan.oldPrice || "",
    price: plan.price || "",
    discount: plan.discount || "",
    buttonTitle: plan.buttonTitle || "",
    features: plan.features || [],
    billingInterval: plan.billingInterval,
    billingIntervalCount: plan.billingIntervalCount,
    stripePriceId: plan.stripePriceId,
    iconType: plan.iconType,
    iconWrapperColor: plan.iconWrapperColor,
    order: plan.order,
  };
}
