"use client";

import { useEffect } from "react";
import type { PricingModelAbVariant } from "@/lib/pricingModelAbTest";
import { setAnalyticsPricingModel } from "@/lib/analyticsPricingModelContext";

type Props = {
  /** When false (`?pm=1|2` preview), skip experiment page_view. */
  participatesInExperiment: boolean;
  variant: PricingModelAbVariant;
  enabled?: boolean;
};

/**
 * Records one pricing-modal plan-list impression per tab session (sessionStorage).
 */
export function PricingModelAbExperimentTracker({
  participatesInExperiment,
  variant,
  enabled = true,
}: Props) {
  useEffect(() => {
    setAnalyticsPricingModel(variant);
  }, [variant]);

  useEffect(() => {
    if (!enabled || !participatesInExperiment) return;
    if (typeof window === "undefined") return;
    const key = `pricing_model_ab_pv_${variant}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/analytics/pricing-model-ab-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "page_view", variant }),
    });
  }, [enabled, participatesInExperiment, variant]);

  return null;
}
