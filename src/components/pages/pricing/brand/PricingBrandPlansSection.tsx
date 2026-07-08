"use client";

import { useMemo } from "react";
import { groupPlansByDuration } from "@/lib/pricingPlanSections";
import { getPlanPriceDisplay } from "@/lib/brandPlanPricing";
import type { DurationGroupKey, SerializedPlan } from "@/types/pricing";
import { PricingBrandPlanCard } from "./PricingBrandPlanCard";

const FREE_FEATURES = [
  "Full diagnostic across all 4 skills",
  "2 sample mock exams",
  "1 AI feedback sample (Writing)",
] as const;

const PAID_FEATURES = [
  "All 100+ full mock exams",
  "All 5,000+ practice questions",
  "Unlimited AI Writing & Speaking feedback",
] as const;

const QUARTERLY_FEATURES = [
  ...PAID_FEATURES,
  "AI teacher study plan & analytics",
] as const;

type PricingBrandPlansSectionProps = {
  plans: SerializedPlan[];
  pricingCheckoutFields?: Record<string, string>;
};

function findSectionPlan(
  grouped: ReturnType<typeof groupPlansByDuration>,
  key: DurationGroupKey,
) {
  return grouped.find((section) => section.key === key)?.plus?.plan ?? null;
}

export function PricingBrandPlansSection({
  plans,
  pricingCheckoutFields,
}: PricingBrandPlansSectionProps) {
  const grouped = useMemo(() => groupPlansByDuration(plans), [plans]);

  const weeklyPlan = findSectionPlan(grouped, "weekly");
  const monthlyPlan = findSectionPlan(grouped, "monthly");
  const quarterlyPlan = findSectionPlan(grouped, "threeMonth");

  const weeklyDisplay = getPlanPriceDisplay(weeklyPlan, "weekly");
  const monthlyDisplay = getPlanPriceDisplay(monthlyPlan, "monthly");
  const quarterlyDisplay = getPlanPriceDisplay(quarterlyPlan, "quarterly");

  return (
    <section className="px-4 pb-14 pt-8 screen744:px-11 screen744:pb-[70px] screen744:pt-10">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-stretch gap-5 screen744:grid-cols-2 screen1280:grid-cols-4 screen744:gap-[22px]">
        <PricingBrandPlanCard
          name="Free trial"
          description="Take your diagnostic and explore the platform."
          price="0"
          priceSuffix=""
          billingNote="for 3 days · no card"
          ctaLabel="Start free"
          ctaHref="/sign-up"
          features={FREE_FEATURES}
        />

        <PricingBrandPlanCard
          name="Weekly"
          description="Short sprint before test day."
          price={weeklyDisplay.price}
          priceSuffix={weeklyDisplay.priceSuffix}
          billingNote={weeklyDisplay.billingNote}
          ctaLabel="Start free, then subscribe"
          plan={weeklyPlan}
          pricingCheckoutFields={pricingCheckoutFields}
          features={PAID_FEATURES}
        />

        <PricingBrandPlanCard
          name="Monthly"
          description="Everything you need to hit your target band."
          price={monthlyDisplay.price}
          priceSuffix={monthlyDisplay.priceSuffix}
          billingNote={monthlyDisplay.billingNote}
          ctaLabel="Start free, then subscribe"
          plan={monthlyPlan}
          pricingCheckoutFields={pricingCheckoutFields}
          features={PAID_FEATURES}
          highlighted
          badge="MOST POPULAR"
        />

        <PricingBrandPlanCard
          name="Quarterly"
          description="Premium with a longer runway before test day."
          price={quarterlyDisplay.price}
          priceSuffix={quarterlyDisplay.priceSuffix}
          billingNote={quarterlyDisplay.billingNote}
          ctaLabel="Start free, then subscribe"
          plan={quarterlyPlan}
          pricingCheckoutFields={pricingCheckoutFields}
          features={QUARTERLY_FEATURES}
        />
      </div>
    </section>
  );
}
