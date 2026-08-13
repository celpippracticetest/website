"use client";

import { useEffect, useMemo } from "react";
import type { PricingAbLayout } from "@/lib/pricingAbTest";
import { trackEcommerce } from "@/lib/analytics";
import { PricingBrandHeader } from "@/components/pages/pricing/brand/PricingBrandHeader";
import { PricingBrandPlansSection } from "@/components/pages/pricing/brand/PricingBrandPlansSection";
import { PricingBrandFaqSection } from "@/components/pages/pricing/brand/PricingBrandFaqSection";
import type { SerializedPlan } from "@/types/pricing";

function parsePrice(raw?: string): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

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

  useEffect(() => {
    if (!plans.length) return;
    const items = plans
      .filter((p) => p.type !== "Free")
      .map((p, index) => ({
        item_id:
          p.stripePriceId || p.stripeProductId || p.type || `plan_${index}`,
        item_name: p.planTitle || p.title || p.type,
        price: parsePrice(p.price),
        quantity: 1,
        index,
      }));
    if (!items.length) return;
    trackEcommerce.viewItemList(items, "pricing_plans", "Pricing Plans");
  }, [plans]);

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
