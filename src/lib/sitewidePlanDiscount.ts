/** Shown on every paid plan and applied at Stripe checkout. */
export const SITEWIDE_PLAN_DISCOUNT_PERCENT = 30;

export const SITEWIDE_PLAN_DISCOUNT_LABEL = `${SITEWIDE_PLAN_DISCOUNT_PERCENT}% OFF`;

/** Stripe rounds the discount (percent × amount) to the nearest cent. */
export function discountedUnitAmountCents(
  unitAmountCents: number,
  percent: number = SITEWIDE_PLAN_DISCOUNT_PERCENT,
): number {
  if (!Number.isFinite(unitAmountCents) || unitAmountCents <= 0) return 0;
  const discountCents = Math.round((unitAmountCents * percent) / 100);
  return Math.max(0, unitAmountCents - discountCents);
}

export function applySitewideDiscount(
  amount: number,
  percent: number = SITEWIDE_PLAN_DISCOUNT_PERCENT,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return amount;
  return discountedUnitAmountCents(Math.round(amount * 100), percent) / 100;
}

export function parseMoneyToCents(value: string): number {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}
