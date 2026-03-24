export const PRICING_AB_COOKIE = "pricing_ab_layout";

export const PRICING_AB_LAYOUTS = ["two_card", "switch_toggle"] as const;
export type PricingAbLayout = (typeof PRICING_AB_LAYOUTS)[number];

export function isPricingAbLayout(value: string | undefined): value is PricingAbLayout {
  return value === "two_card" || value === "switch_toggle";
}

export function parsePricingAbLayout(value: string | undefined): PricingAbLayout {
  return isPricingAbLayout(value) ? value : "two_card";
}

/**
 * One-off preview: `/pricing?s=1` (two cards) or `/pricing?s=2` (toggle).
 * Does not change the assignment cookie; do not count in A/B metrics or checkout attribution.
 */
export function parsePricingStylePreviewQuery(s: string | undefined): PricingAbLayout | null {
  const t = s?.trim();
  if (t === "1") return "two_card";
  if (t === "2") return "switch_toggle";
  return null;
}

export const PRICING_AB_EVENT_TYPES = [
  "page_view",
  "checkout_started",
  "purchase",
] as const;
export type PricingAbEventType = (typeof PRICING_AB_EVENT_TYPES)[number];
