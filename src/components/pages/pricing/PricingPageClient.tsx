"use client";

import { useEffect, useMemo } from "react";
import type { PricingAbLayout } from "@/lib/pricingAbTest";
import { PricingBrandHeader } from "@/components/pages/pricing/brand/PricingBrandHeader";
import { PricingBrandPlansSection } from "@/components/pages/pricing/brand/PricingBrandPlansSection";
import { PricingBrandFaqSection } from "@/components/pages/pricing/brand/PricingBrandFaqSection";
import type { SerializedPlan } from "@/types/pricing";

interface PricingPageClientProps {
  plans: SerializedPlan[];
  pricingAbLayout: PricingAbLayout;
  pricingAbParticipatesInExperiment: boolean;
}

export default function PricingPageClient({
  plans,
  pricingAbLayout,
  pricingAbParticipatesInExperiment,
}: PricingPageClientProps) {
  const pricingCheckoutFields = useMemo(() => {
    if (!pricingAbParticipatesInExperiment) return undefined;
    return { pricing_ab_layout: pricingAbLayout };
  }, [pricingAbLayout, pricingAbParticipatesInExperiment]);

  useEffect(() => {
    if (!pricingAbParticipatesInExperiment) return;
    if (typeof window === "undefined") return;
    const key = `pricing_ab_pv_${pricingAbLayout}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/analytics/pricing-ab-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "page_view", layout: pricingAbLayout }),
    });
  }, [pricingAbLayout, pricingAbParticipatesInExperiment]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center bg-[#eef2f8] px-6 pb-[72px] pt-14 box-border">
      <div className="flex w-full max-w-[1060px] flex-col items-center">
        <PricingBrandHeader />
        <PricingBrandPlansSection
          plans={plans}
          pricingCheckoutFields={pricingCheckoutFields}
          featuredPlan="Monthly"
          showPerWeek
        />
        <div className="mt-16 w-full">
          <PricingBrandFaqSection />
        </div>
      </div>
    </div>
  );
}
