import "server-only";

/**
 * Black Friday 2026 — TEMPORARY (revert Mon 2026-11-30). Server side of
 * `@/lib/blackFriday`: eligibility from the request's IP country + purchase
 * history, and the auto-applied Stripe coupon.
 */

import { stripe } from "@/lib/stripe";
import { getDb } from "@/lib/appDocumentsClient";
import {
  BLACK_FRIDAY_ENDS_AT_MS,
  BLACK_FRIDAY_PERCENT,
  isBlackFridayActive,
  isBlackFridayCountry,
} from "@/lib/blackFriday";

/** One stable coupon: 50% off, first invoice only, unusable after the sale. */
const BLACK_FRIDAY_COUPON_ID = "black_friday_2026_50_first";

export function countryFromRequestHeaders(headers: Headers): string | null {
  // Local testing only (no IP-country header on localhost); ignored in production.
  if (process.env.NODE_ENV !== "production" && process.env.BLACK_FRIDAY_DEV_COUNTRY) {
    return process.env.BLACK_FRIDAY_DEV_COUNTRY.trim().toUpperCase();
  }
  return (
    headers.get("x-vercel-ip-country")?.trim().toUpperCase() ||
    headers.get("cf-ipcountry")?.trim().toUpperCase() ||
    null
  );
}

/** True when the user has paid before (any completed checkout or a purchase flag). */
export async function userHasEverPaid(
  userId: string | null | undefined,
  metadata?: { hasEverPurchased?: unknown } | null,
): Promise<boolean> {
  if (!userId) return false;
  if (metadata?.hasEverPurchased === true) return true;
  const db = await getDb();
  const paid = await db
    .collection("checkouts")
    .findOne({ userId, status: "complete" }, { projection: { _id: 1 } });
  return Boolean(paid);
}

/**
 * Sale running + CA/US/AU IP + never paid. Guests (no user yet) count as
 * eligible for display; checkout always has a signed-in user.
 */
export async function isBlackFridayEligible(input: {
  country: string | null;
  userId?: string | null;
  metadata?: { hasEverPurchased?: unknown } | null;
}): Promise<boolean> {
  if (!isBlackFridayActive() || !isBlackFridayCountry(input.country)) return false;
  try {
    return !(await userHasEverPaid(input.userId, input.metadata));
  } catch (error) {
    console.error("[black-friday] purchase history check failed", error);
    return false;
  }
}

export async function resolveBlackFridayCouponId(): Promise<string> {
  try {
    const existing = await stripe.coupons.retrieve(BLACK_FRIDAY_COUPON_ID);
    if (existing.valid !== false) return existing.id;
    throw new Error("Black Friday coupon is no longer valid");
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "resource_missing") throw error;
  }

  try {
    const created = await stripe.coupons.create({
      id: BLACK_FRIDAY_COUPON_ID,
      percent_off: BLACK_FRIDAY_PERCENT,
      duration: "once",
      redeem_by: Math.floor(BLACK_FRIDAY_ENDS_AT_MS / 1000),
      name: "Black Friday 50% off first payment",
      metadata: { source: "black_friday_2026" },
    });
    return created.id;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "resource_already_exists") throw error;
    return BLACK_FRIDAY_COUPON_ID;
  }
}
