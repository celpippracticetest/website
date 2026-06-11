export const PRICING_MODEL_AB_COOKIE = "pricing_ab_model";

/**
 * Pricing modal plan-list display (style 1 radiogroup):
 * - `period` — show billed amount per cadence (CA$49.99 monthly)
 * - `weekly_equiv` — show per-week price with cadence footnote (CA$11.54, pay monthly)
 */
export const PRICING_MODEL_AB_VARIANTS = ["period", "weekly_equiv"] as const;
export type PricingModelAbVariant = (typeof PRICING_MODEL_AB_VARIANTS)[number];

export function isPricingModelAbVariant(
  value: string | undefined,
): value is PricingModelAbVariant {
  return value === "period" || value === "weekly_equiv";
}

export function parsePricingModelAbVariant(value: string | undefined): PricingModelAbVariant {
  return isPricingModelAbVariant(value) ? value : "period";
}

/** Random 50/50 assignment for middleware when cookie is missing. */
export function pickPricingModelAbVariant(): PricingModelAbVariant {
  return Math.random() < 0.5 ? "period" : "weekly_equiv";
}

/**
 * Preview query for QA (`?pm=1` period, `?pm=2` weekly_equiv). Does not change the cookie;
 * exclude from experiment metrics.
 */
export function parsePricingModelPreviewQuery(pm: string | undefined): PricingModelAbVariant | null {
  const t = pm?.trim();
  if (t === "1") return "period";
  if (t === "2") return "weekly_equiv";
  return null;
}

/** GA4 / analytics arm label: A = period pricing, B = weekly-equivalent pricing. */
export type PricingModelAnalyticsArm = "a" | "b";

export function toPricingModelAnalyticsArm(
  variant: PricingModelAbVariant,
): PricingModelAnalyticsArm {
  return variant === "weekly_equiv" ? "b" : "a";
}

export const PRICING_MODEL_AB_EVENT_TYPES = [
  "page_view",
  "checkout_started",
  "purchase",
] as const;
export type PricingModelAbEventType = (typeof PRICING_MODEL_AB_EVENT_TYPES)[number];

export function isPricingModelAbEventType(value: unknown): value is PricingModelAbEventType {
  return (
    typeof value === "string" &&
    (PRICING_MODEL_AB_EVENT_TYPES as readonly string[]).includes(value)
  );
}
