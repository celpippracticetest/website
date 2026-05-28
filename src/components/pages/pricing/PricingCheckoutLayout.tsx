"use client";

import { PricingModalHero } from "@/components/pages/pricing/PricingModalHero";
import { PricingModalPlanList } from "@/components/pages/pricing/PricingModalPlanList";
import { PricingUrgencyBanner } from "@/components/pages/pricing/PricingUrgencyBanner";
import { durationDisplayOrder } from "@/lib/pricingCatalog";
import { cn } from "@/lib/utils";
import type { PricingPlanSection } from "@/lib/pricingPlanSections";
import type { DurationGroupKey, SerializedPlan } from "@/types/pricing";

type PricingCheckoutLayoutProps = {
  plans: SerializedPlan[];
  groupedPlans: PricingPlanSection[];
  recommendedPlanId: string | null;
  recommendedSectionKey: DurationGroupKey | null;
  pricingCheckoutFields?: Record<string, string>;
  showUrgencyBanner?: boolean;
  asPageHeading?: boolean;
  className?: string;
  id?: string;
};

export function PricingCheckoutLayout({
  plans,
  groupedPlans,
  recommendedPlanId,
  recommendedSectionKey,
  pricingCheckoutFields,
  showUrgencyBanner = true,
  asPageHeading = false,
  className,
  id,
}: PricingCheckoutLayoutProps) {
  const visibleSections = durationDisplayOrder
    .map((key) => groupedPlans.find((section) => section.key === key))
    .filter(Boolean) as PricingPlanSection[];

  return (
    <div id={id} className={cn("relative z-[1]", className)}>
      {showUrgencyBanner ? (
        <div className="mb-6">
          <PricingUrgencyBanner />
        </div>
      ) : null}
      <div className="mx-auto flex max-w-5xl flex-col items-stretch justify-center gap-6 pt-8 pb-10 md:pt-10 md:pb-12 lg:flex-row lg:items-start lg:gap-8">
        <div className="w-full lg:w-1/2">
          <PricingModalHero align="left" asPageHeading={asPageHeading} />
        </div>
        <div className="w-full lg:w-1/2">
          <PricingModalPlanList
            plans={plans}
            sections={visibleSections}
            recommendedPlanId={recommendedPlanId}
            recommendedSectionKey={recommendedSectionKey}
            pricingCheckoutFields={pricingCheckoutFields}
          />
        </div>
      </div>
    </div>
  );
}
