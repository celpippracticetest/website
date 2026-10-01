import { SITEWIDE_PLAN_DISCOUNT_PERCENT } from "@/lib/sitewidePlanDiscount";

/** Sticky assignment: `a` = current prices, `b` = 30% off every plan. */
export const PLAN_DISCOUNT_AB_COOKIE = "plan_discount_ab";

export const PLAN_DISCOUNT_AB_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const PLAN_DISCOUNT_AB_VARIANTS = ["a", "b"] as const;
export type PlanDiscountAbVariant = (typeof PLAN_DISCOUNT_AB_VARIANTS)[number];

export function isPlanDiscountAbVariant(
  value: string | undefined | null,
): value is PlanDiscountAbVariant {
  return value === "a" || value === "b";
}

/** Random 50/50 assignment when the cookie is missing. */
export function pickPlanDiscountAbVariant(): PlanDiscountAbVariant {
  return Math.random() < 0.5 ? "a" : "b";
}

/**
 * QA override (`?plan_ab=a` current, `?plan_ab=b` 30% off).
 * Middleware writes this onto the sticky cookie so checkout matches the page.
 */
export function parsePlanDiscountPreviewQuery(
  value: string | null | undefined,
): PlanDiscountAbVariant | null {
  const t = value?.trim().toLowerCase();
  if (t === "a" || t === "1") return "a";
  if (t === "b" || t === "2") return "b";
  return null;
}

export function planDiscountPercent(variant: PlanDiscountAbVariant): number {
  return variant === "b" ? SITEWIDE_PLAN_DISCOUNT_PERCENT : 0;
}

export function readBrowserPlanDiscountVariant(): PlanDiscountAbVariant {
  if (typeof document === "undefined") return "a";
  const match = document.cookie.match(
    /(?:^|;\s*)plan_discount_ab=([^;]+)/,
  );
  const value = match?.[1]?.trim();
  return isPlanDiscountAbVariant(value) ? value : "a";
}

export function upsertCookieHeader(
  cookieHeader: string,
  name: string,
  value: string,
): string {
  const parts = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith(`${name}=`));
  parts.push(`${name}=${value}`);
  return parts.join("; ");
}
