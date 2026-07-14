"use client";

import { useMemo } from "react";
import {
  getFeaturedBadge,
  getPlanPriceDisplay,
  type FeaturedPlanName,
} from "@/lib/brandPlanPricing";
import { groupPlansByDuration } from "@/lib/pricingPlanSections";
import type { DurationGroupKey, SerializedPlan } from "@/types/pricing";
import { PricingBrandPlanCard } from "./PricingBrandPlanCard";

const PAID_FEATURES = [
  "Unlimited access to 3,000+ practices",
  "60 full mock exams",
  "Instant AI feedback for all skills",
  "Progress tracking and insights",
] as const;

const PLAN_TINTS = {
  Weekly: { tint: "#fdf3e4", tintText: "#d97a2e" },
  Monthly: { tint: "#eaf1fe", tintText: "#3d6fe8" },
  Quarterly: { tint: "#f7e6fb", tintText: "#b23fe0" },
} as const;

type PricingBrandPlansSectionProps = {
  plans: SerializedPlan[];
  pricingCheckoutFields?: Record<string, string>;
  featuredPlan?: FeaturedPlanName;
  showPerWeek?: boolean;
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
  featuredPlan = "Monthly",
  showPerWeek = true,
}: PricingBrandPlansSectionProps) {
  const grouped = useMemo(() => groupPlansByDuration(plans), [plans]);

  const weeklyPlan = findSectionPlan(grouped, "weekly");
  const monthlyPlan = findSectionPlan(grouped, "monthly");
  const quarterlyPlan = findSectionPlan(grouped, "threeMonth");

  const weeklyDisplay = getPlanPriceDisplay(weeklyPlan, "weekly", {
    showPerWeek,
  });
  const monthlyDisplay = getPlanPriceDisplay(monthlyPlan, "monthly", {
    weeklyPlan,
    showPerWeek,
  });
  const quarterlyDisplay = getPlanPriceDisplay(quarterlyPlan, "quarterly", {
    weeklyPlan,
    showPerWeek,
  });

  const cards = [
    {
      name: "Weekly" as const,
      plan: weeklyPlan,
      display: weeklyDisplay,
    },
    {
      name: "Monthly" as const,
      plan: monthlyPlan,
      display: monthlyDisplay,
    },
    {
      name: "Quarterly" as const,
      plan: quarterlyPlan,
      display: quarterlyDisplay,
    },
  ];

  return (
    <section className="mt-10 flex w-full flex-col items-center">
      <div className="flex w-full flex-wrap items-stretch justify-center gap-5 pt-3">
        {cards.map(({ name, plan, display }) => {
          const featured = name === featuredPlan;
          return (
            <PricingBrandPlanCard
              key={name}
              name={name}
              price={display.price}
              priceSuffix={display.priceSuffix}
              perWeekEquivalent={display.perWeekEquivalent}
              saveLabel={display.saveLabel}
              plan={plan}
              pricingCheckoutFields={pricingCheckoutFields}
              features={PAID_FEATURES}
              highlighted={featured}
              badge={featured ? getFeaturedBadge(name) : undefined}
              tint={PLAN_TINTS[name]}
            />
          );
        })}
      </div>

      <div className="mt-7 flex items-center gap-2 text-[13px] text-[#5b6575]">
        <span className="font-bold text-[#2e9e5b]" aria-hidden>
          ✓
        </span>
        48-hour money-back guarantee · Cancel anytime
      </div>
    </section>
  );
}
