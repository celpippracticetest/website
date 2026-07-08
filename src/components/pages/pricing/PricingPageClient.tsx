"use client";

import { useEffect, useMemo } from "react";
import type { PricingAbLayout } from "@/lib/pricingAbTest";
import { PricingBrandHeader } from "@/components/pages/pricing/brand/PricingBrandHeader";
import { PricingBrandPlansSection } from "@/components/pages/pricing/brand/PricingBrandPlansSection";
import { PricingBrandComparisonTable } from "@/components/pages/pricing/brand/PricingBrandComparisonTable";
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
    <div className="bg-white">
      <PricingBrandHeader />
      <PricingBrandPlansSection
        plans={plans}
        pricingCheckoutFields={pricingCheckoutFields}
      />
      <PricingBrandComparisonTable />
      <PricingBrandFaqSection />
    </div>
  );
}
