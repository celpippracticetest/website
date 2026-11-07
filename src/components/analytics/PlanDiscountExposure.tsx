"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { readBrowserPlanDiscountVariantOrNull } from "@/lib/planDiscountAb";

/**
 * Logs that this visitor actually saw plan prices, tagged with their `plan_discount_ab` arm.
 * Exposures per arm are the denominator for the price test's conversion rate in GA4.
 * Skipped for QA previews (`?plan_ab=`) and visitors without an assigned arm.
 */
export function PlanDiscountExposure({ surface }: { surface: string }) {
  useEffect(() => {
    const variant = readBrowserPlanDiscountVariantOrNull();
    if (!variant) return;
    if (new URLSearchParams(window.location.search).has("plan_ab")) return;
    trackEvent({
      event: "plan_discount_ab_exposure",
      plan_discount_ab: variant,
      pricing_surface: surface,
    });
  }, [surface]);

  return null;
}
