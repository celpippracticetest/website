import "server-only";

import type Stripe from "stripe";

import { getDurationGroupKeyFromStripeRecurring } from "@/lib/pricing";
import { stripe } from "@/lib/stripe";
import type { DurationGroupKey } from "@/types/pricing";

export const INDIA_COUNTRY_CODE = "IN";
export const INDIA_CURRENCY = "inr";

/** Stripe unit amounts (paise) for India geo pricing. */
export const INDIA_INR_UNIT_AMOUNTS: Partial<Record<DurationGroupKey, number>> = {
  weekly: 39900,
  monthly: 99900,
  threeMonth: 199900,
};

export function isIndiaCountry(country: string | null | undefined): boolean {
  return country?.trim().toUpperCase() === INDIA_COUNTRY_CODE;
}

function productIdOf(price: Stripe.Price): string | null {
  if (typeof price.product === "string") return price.product;
  if (price.product && typeof price.product === "object" && "id" in price.product) {
    return price.product.id;
  }
  return null;
}

function durationKeyForPrice(price: Stripe.Price): DurationGroupKey | null {
  if (!price.recurring) return null;
  return getDurationGroupKeyFromStripeRecurring(
    price.recurring.interval,
    price.recurring.interval_count
  );
}

function lookupKeyForIndiaPrice(
  productId: string,
  interval: Stripe.Price.Recurring.Interval,
  intervalCount: number
): string {
  return `in_${productId}_${interval}_${intervalCount}`.slice(0, 200);
}

function recurringMatches(left: Stripe.Price, right: Stripe.Price): boolean {
  if (!left.recurring || !right.recurring) return false;
  return (
    left.recurring.interval === right.recurring.interval &&
    (left.recurring.interval_count ?? 1) === (right.recurring.interval_count ?? 1)
  );
}

const resolvedIndiaPriceCache = new Map<string, Stripe.Price>();

/**
 * For India IPs, use the INR Stripe price on the same product (create if missing).
 * Other countries keep the catalog (CAD) price.
 */
export async function resolveStripePriceForCountry(
  price: Stripe.Price,
  country: string | null | undefined
): Promise<Stripe.Price> {
  if (!isIndiaCountry(country)) return price;
  if (price.currency === INDIA_CURRENCY) return price;
  if (!price.recurring || !price.active) return price;

  const durationKey = durationKeyForPrice(price);
  const unitAmount = durationKey ? INDIA_INR_UNIT_AMOUNTS[durationKey] : undefined;
  if (unitAmount == null) return price;

  const productId = productIdOf(price);
  if (!productId) return price;

  const cacheKey = `${productId}:${price.recurring.interval}:${price.recurring.interval_count ?? 1}`;
  const cached = resolvedIndiaPriceCache.get(cacheKey);
  if (cached) return cached;

  const listed = await stripe.prices.list({
    product: productId,
    active: true,
    currency: INDIA_CURRENCY,
    limit: 100,
  });

  const siblings = listed.data.filter((candidate) => recurringMatches(candidate, price));
  const exactAmount = siblings.find((candidate) => candidate.unit_amount === unitAmount);
  const found = exactAmount ?? siblings[0];
  if (found) {
    resolvedIndiaPriceCache.set(cacheKey, found);
    return found;
  }

  const interval = price.recurring.interval;
  const intervalCount = price.recurring.interval_count ?? 1;
  const lookupKey = lookupKeyForIndiaPrice(productId, interval, intervalCount);

  try {
    const created = await stripe.prices.create({
      product: productId,
      currency: INDIA_CURRENCY,
      unit_amount: unitAmount,
      recurring: {
        interval,
        interval_count: intervalCount,
      },
      nickname: `India ${durationKey}`,
      lookup_key: lookupKey,
      ...(price.tax_behavior && price.tax_behavior !== "unspecified"
        ? { tax_behavior: price.tax_behavior }
        : {}),
      metadata: {
        region: INDIA_COUNTRY_CODE,
        geo_price: "india",
      },
    });
    resolvedIndiaPriceCache.set(cacheKey, created);
    return created;
  } catch (err) {
    const existing = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    if (existing.data[0]) {
      resolvedIndiaPriceCache.set(cacheKey, existing.data[0]);
      return existing.data[0];
    }
    console.error("resolveStripePriceForCountry: failed to create INR price", err);
    return price;
  }
}
