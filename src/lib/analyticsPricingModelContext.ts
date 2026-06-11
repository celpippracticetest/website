import {
  PRICING_MODEL_AB_COOKIE,
  parsePricingModelAbVariant,
  parsePricingModelPreviewQuery,
  toPricingModelAnalyticsArm,
  type PricingModelAbVariant,
  type PricingModelAnalyticsArm,
} from "@/lib/pricingModelAbTest";
import { setGa4UserProperties } from "@/lib/ga4Browser";

declare global {
  interface Window {
    /** Raw experiment arm from cookie / preview (`period` | `weekly_equiv`). */
    __CELPIP_ANALYTICS_PRICING_MODEL?: PricingModelAbVariant;
    /** GA4-friendly arm label (`a` | `b`). */
    __CELPIP_ANALYTICS_PRICING_AB?: PricingModelAnalyticsArm;
  }
}

function readVariantFromCookie(): PricingModelAbVariant | null {
  if (typeof document === "undefined") return null;
  const escaped = PRICING_MODEL_AB_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escaped}=(period|weekly_equiv)`),
  );
  return match?.[1] === "period" || match?.[1] === "weekly_equiv" ? match[1] : null;
}

function readVariantFromPreviewQuery(): PricingModelAbVariant | null {
  if (typeof window === "undefined") return null;
  return parsePricingModelPreviewQuery(
    new URLSearchParams(window.location.search).get("pm") ?? undefined,
  );
}

/** Persist pricing-model A/B arm for GA4 user properties and event enrichment. */
export function setAnalyticsPricingModel(variant: PricingModelAbVariant): void {
  if (typeof window === "undefined") return;

  const arm = toPricingModelAnalyticsArm(variant);
  window.__CELPIP_ANALYTICS_PRICING_MODEL = variant;
  window.__CELPIP_ANALYTICS_PRICING_AB = arm;

  setGa4UserProperties({
    pricing_ab_model: arm,
    pricing_ab_model_variant: variant,
  });
}

/** Pricing modal A/B arms for GA4 (`pricing_ab_model`: a | b). */
export function getAnalyticsPricingModelContext(): {
  pricing_ab_model: PricingModelAnalyticsArm;
  pricing_ab_model_variant: PricingModelAbVariant;
} {
  if (typeof window !== "undefined") {
    if (window.__CELPIP_ANALYTICS_PRICING_AB && window.__CELPIP_ANALYTICS_PRICING_MODEL) {
      return {
        pricing_ab_model: window.__CELPIP_ANALYTICS_PRICING_AB,
        pricing_ab_model_variant: window.__CELPIP_ANALYTICS_PRICING_MODEL,
      };
    }
  }

  const preview = readVariantFromPreviewQuery();
  const fromCookie = readVariantFromCookie();
  const variant = preview ?? parsePricingModelAbVariant(fromCookie ?? undefined);
  return {
    pricing_ab_model: toPricingModelAnalyticsArm(variant),
    pricing_ab_model_variant: variant,
  };
}

export function resolveAnalyticsPricingModelVariant(): PricingModelAbVariant {
  return getAnalyticsPricingModelContext().pricing_ab_model_variant;
}
