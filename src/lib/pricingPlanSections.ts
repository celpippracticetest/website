import { durationDisplayOrder, durationMeta } from "@/lib/pricingCatalog";
import { getDurationGroupKey, getStablePlanId } from "@/lib/pricing";
import type { DurationGroupKey, SerializedPlan } from "@/types/pricing";

export type GroupedPlanItem = {
  plan: SerializedPlan;
  index: number;
  stableId: string;
};

export type PricingPlanSection = {
  key: DurationGroupKey;
  plus: GroupedPlanItem | null;
  title: string;
  eyebrow: string;
  summary: string;
};

export function sortPlansByOrder(plans: SerializedPlan[]): SerializedPlan[] {
  return [...plans].sort((left, right) => {
    const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}

export function groupPlansByDuration(plans: SerializedPlan[]): PricingPlanSection[] {
  const groupedEntries = new Map<DurationGroupKey, GroupedPlanItem[]>();

  plans.forEach((plan, index) => {
    const durationKey = getDurationGroupKey(plan);
    if (!durationKey) {
      return;
    }

    const nextItem: GroupedPlanItem = {
      plan,
      index,
      stableId: getStablePlanId(plan, index),
    };

    groupedEntries.set(durationKey, [...(groupedEntries.get(durationKey) || []), nextItem]);
  });

  return durationDisplayOrder
    .map((key) => {
      const items = groupedEntries.get(key) || [];
      const plus = items[0] ?? null;

      return {
        key,
        ...durationMeta[key],
        plus,
      };
    })
    .filter((section) => section.plus);
}

export function getPricingPlansGridClassName(visibleDurationKeys: DurationGroupKey[]): string {
  const n = visibleDurationKeys.length;
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 sm:grid-cols-2";
  if (n === 3) return "grid-cols-1 sm:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
}
