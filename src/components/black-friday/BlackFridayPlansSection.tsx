"use client";

/**
 * Black Friday 2026 — TEMPORARY (revert Mon 2026-11-30).
 * Replaces the /plans cards for eligible visitors (the server decides).
 */

import { useMemo } from "react";
import { usePlans } from "@/hooks/usePlans";
import { toSerializedPlans } from "@/components/premium-plan/PremiumPaywallOverlay";
import { PricingBrandPlansSection } from "@/components/pages/pricing/brand/PricingBrandPlansSection";
import { BLACK_FRIDAY_PERCENT } from "@/lib/blackFriday";
import { BlackFridayPricingHero } from "./BlackFridayPricingHero";

export function BlackFridayPlansSection() {
  const { plans, isLoading } = usePlans();
  const serializedPlans = useMemo(() => toSerializedPlans(plans), [plans]);

  return (
    <section
      id="plans"
      aria-labelledby="plans-heading"
      className="mx-auto mt-[24px] flex w-full max-w-[1100px] flex-col items-center px-[16px] pb-[48px]"
    >
      <BlackFridayPricingHero titleTag="h2" />
      <h3 id="plans-heading" className="sr-only">
        Choose your plan
      </h3>
      {isLoading ? (
        <p className="mt-10 text-sm text-[#5b6575]">Loading plans…</p>
      ) : (
        <PricingBrandPlansSection
          plans={serializedPlans}
          featuredPlan="Monthly"
          showPerWeek
          discountPercent={BLACK_FRIDAY_PERCENT}
          blackFriday
        />
      )}
    </section>
  );
}
