"use client";

import { useEffect } from "react";
import {
  PRICING_MODEL_AB_COOKIE,
  parsePricingModelAbVariant,
  parsePricingModelPreviewQuery,
} from "@/lib/pricingModelAbTest";
import { setAnalyticsPricingModel } from "@/lib/analyticsPricingModelContext";

/**
 * Sets GA4 user properties and in-memory context for the pricing modal A/B arm
 * (`pricing_ab_model`: a = period, b = weekly-equivalent).
 */
export default function PricingModelAbAnalyticsTracker() {
  useEffect(() => {
    const preview = parsePricingModelPreviewQuery(
      new URLSearchParams(window.location.search).get("pm") ?? undefined,
    );
    if (preview) {
      setAnalyticsPricingModel(preview);
      return;
    }

    const escaped = PRICING_MODEL_AB_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${escaped}=(period|weekly_equiv)`),
    );
    setAnalyticsPricingModel(parsePricingModelAbVariant(match?.[1]));
  }, []);

  return null;
}
