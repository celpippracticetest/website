"use client";

import { useMemo } from "react";
import { PricingPlanCheckoutTile } from "@/components/pages/pricing/PricingPlanCheckoutTile";
import { PricingUrgencyBanner } from "@/components/pages/pricing/PricingUrgencyBanner";
import { buildMonthlySavingsMap } from "@/lib/pricing";
import {
  getPricingPlansGridClassName,
  groupPlansByDuration,
  sortPlansByOrder,
} from "@/lib/pricingPlanSections";
import { cn } from "@/lib/utils";
import { durationDisplayOrder } from "@/lib/pricingCatalog";
import type { DurationGroupKey, SerializedPlan } from "@/types/pricing";

export type PricingPlansCheckoutGridProps = {
  plans: SerializedPlan[];
  pricingCheckoutFields?: Record<string, string>;
  recommendedPlanId?: string | null;
  recommendedSectionKey?: DurationGroupKey | null;
  showUrgencyBanner?: boolean;
  compact?: boolean;
  className?: string;
  gridClassName?: string;
};

export function PricingPlansCheckoutGrid({
  plans,
  pricingCheckoutFields,
  recommendedPlanId = null,
  recommendedSectionKey = null,
  showUrgencyBanner = true,
  compact = false,
  className,
  gridClassName,
}: PricingPlansCheckoutGridProps) {
  const orderedPlans = useMemo(() => sortPlansByOrder(plans), [plans]);
  const groupedPlans = useMemo(() => groupPlansByDuration(orderedPlans), [orderedPlans]);
  const monthlySavingsById = useMemo(() => buildMonthlySavingsMap(orderedPlans), [orderedPlans]);

  const visibleDurationKeys = useMemo(
    () => durationDisplayOrder.filter((key) => groupedPlans.some((section) => section.key === key)),
    [groupedPlans]
  );

  const resolvedGridClassName = useMemo(
    () => gridClassName ?? getPricingPlansGridClassName(visibleDurationKeys),
    [gridClassName, visibleDurationKeys]
  );

  if (groupedPlans.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {showUrgencyBanner ? <PricingUrgencyBanner /> : null}
      <div
        className={cn("grid items-stretch gap-6", resolvedGridClassName)}
        role="group"
        aria-label="Choose billing period"
      >
        {visibleDurationKeys.map((key) => {
          const section = groupedPlans.find((entry) => entry.key === key)!;
          return (
            <PricingPlanCheckoutTile
              key={key}
              section={section}
              pricingCheckoutFields={pricingCheckoutFields}
              monthlySavingsById={monthlySavingsById}
              recommendedPlanId={recommendedPlanId}
              recommendedSectionKey={recommendedSectionKey}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
}
