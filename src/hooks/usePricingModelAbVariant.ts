"use client";

import { useEffect, useState } from "react";
import {
  PRICING_MODEL_AB_COOKIE,
  parsePricingModelAbVariant,
  parsePricingModelPreviewQuery,
  type PricingModelAbVariant,
} from "@/lib/pricingModelAbTest";
import { setAnalyticsPricingModel } from "@/lib/analyticsPricingModelContext";

export function usePricingModelAbVariant() {
  const [variant, setVariant] = useState<PricingModelAbVariant>("period");
  const [participatesInExperiment, setParticipatesInExperiment] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const previewVariant = parsePricingModelPreviewQuery(
      new URLSearchParams(window.location.search).get("pm") ?? undefined,
    );
    if (previewVariant) {
      setVariant(previewVariant);
      setParticipatesInExperiment(false);
      setAnalyticsPricingModel(previewVariant);
      return;
    }

    const escaped = PRICING_MODEL_AB_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${escaped}=(period|weekly_equiv)`),
    );
    const assigned = parsePricingModelAbVariant(match?.[1]);
    setVariant(assigned);
    setParticipatesInExperiment(true);
    setAnalyticsPricingModel(assigned);
  }, []);

  return { variant, participatesInExperiment };
}
