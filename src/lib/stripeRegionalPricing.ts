import "server-only";

import type Stripe from "stripe";

import { getDurationGroupKeyFromStripeRecurring } from "@/lib/pricing";
import { stripe } from "@/lib/stripe";
import type { DurationGroupKey } from "@/types/pricing";

type RegionalPricing = {
  /** ISO 3166-1 alpha-2, as sent in x-vercel-ip-country / cf-ipcountry. */
  country: string;
  /** ISO 4217, lowercase as Stripe uses it. */
  currency: string;
  /** Short name used in Stripe price nicknames / metadata. */
  name: string;
  /** Stripe unit amounts in the currency's minor unit (paise, kobo, ...). */
  unitAmounts: Partial<Record<DurationGroupKey, number>>;
};

/**
 * Geo pricing: visitors from these countries see and are charged these prices
 * (a sibling Stripe price on the same product, created on first use). Everyone
 * else keeps the catalog (CAD) price. Add a country here to price it locally.
 */
export const REGIONAL_PRICING: Record<string, RegionalPricing> = {
  IN: {
    country: "IN",
    currency: "inr",
    name: "India",
    // ₹399 / ₹999 / ₹1,999
    unitAmounts: { weekly: 39900, monthly: 99900, threeMonth: 199900 },
  },
  NG: {
    country: "NG",
    currency: "ngn",
    name: "Nigeria",
    // ₦3,900 / ₦9,900 / ₦19,900
    unitAmounts: { weekly: 390000, monthly: 990000, threeMonth: 1990000 },
  },
};

export const INDIA_COUNTRY_CODE = "IN";
export const INDIA_CURRENCY = REGIONAL_PRICING.IN.currency;
/** Stripe unit amounts (paise) for India geo pricing. */
export const INDIA_INR_UNIT_AMOUNTS = REGIONAL_PRICING.IN.unitAmounts;

export function getRegionalPricing(country: string | null | undefined): RegionalPricing | null {
  const code = country?.trim().toUpperCase();
  return (code && REGIONAL_PRICING[code]) || null;
}

/** True when this country has its own local-currency prices. */
export function hasRegionalPricing(country: string | null | undefined): boolean {
  return getRegionalPricing(country) !== null;
}

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

/** India keeps its original lookup-key prefix so existing INR prices are reused. */
function lookupKeyForRegionalPrice(
  region: RegionalPricing,
  productId: string,
  interval: Stripe.Price.Recurring.Interval,
  intervalCount: number
): string {
  return `${region.country.toLowerCase()}_${productId}_${interval}_${intervalCount}`.slice(0, 200);
}

function recurringMatches(left: Stripe.Price, right: Stripe.Price): boolean {
  if (!left.recurring || !right.recurring) return false;
  return (
    left.recurring.interval === right.recurring.interval &&
    (left.recurring.interval_count ?? 1) === (right.recurring.interval_count ?? 1)
  );
}

const resolvedRegionalPriceCache = new Map<string, Stripe.Price>();

/**
 * For visitors from a country in REGIONAL_PRICING, use the local-currency Stripe
 * price on the same product (create it if missing). Other countries keep the
 * catalog (CAD) price.
 */
export async function resolveStripePriceForCountry(
  price: Stripe.Price,
  country: string | null | undefined
): Promise<Stripe.Price> {
  const region = getRegionalPricing(country);
  if (!region) return price;
  if (price.currency === region.currency) return price;
  if (!price.recurring || !price.active) return price;

  const durationKey = durationKeyForPrice(price);
  const unitAmount = durationKey ? region.unitAmounts[durationKey] : undefined;
  if (unitAmount == null) return price;

  const productId = productIdOf(price);
  if (!productId) return price;

  const cacheKey = `${region.currency}:${productId}:${price.recurring.interval}:${price.recurring.interval_count ?? 1}`;
  const cached = resolvedRegionalPriceCache.get(cacheKey);
  if (cached) return cached;

  const listed = await stripe.prices.list({
    product: productId,
    active: true,
    currency: region.currency,
    limit: 100,
  });

  const siblings = listed.data.filter((candidate) => recurringMatches(candidate, price));
  const exactAmount = siblings.find((candidate) => candidate.unit_amount === unitAmount);
  const found = exactAmount ?? siblings[0];
  if (found) {
    resolvedRegionalPriceCache.set(cacheKey, found);
    return found;
  }

  const interval = price.recurring.interval;
  const intervalCount = price.recurring.interval_count ?? 1;
  const lookupKey = lookupKeyForRegionalPrice(region, productId, interval, intervalCount);

  try {
    const created = await stripe.prices.create({
      product: productId,
      currency: region.currency,
      unit_amount: unitAmount,
      recurring: {
        interval,
        interval_count: intervalCount,
      },
      nickname: `${region.name} ${durationKey}`,
      lookup_key: lookupKey,
      ...(price.tax_behavior && price.tax_behavior !== "unspecified"
        ? { tax_behavior: price.tax_behavior }
        : {}),
      metadata: {
        region: region.country,
        geo_price: region.name.toLowerCase(),
      },
    });
    resolvedRegionalPriceCache.set(cacheKey, created);
    return created;
  } catch (err) {
    const existing = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    if (existing.data[0]) {
      resolvedRegionalPriceCache.set(cacheKey, existing.data[0]);
      return existing.data[0];
    }
    console.error(
      `resolveStripePriceForCountry: failed to create ${region.currency.toUpperCase()} price`,
      err
    );
    return price;
  }
}
