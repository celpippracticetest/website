import "server-only";

import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import {
  discountedUnitAmountCents,
  SITEWIDE_PLAN_DISCOUNT_PERCENT,
} from "@/lib/sitewidePlanDiscount";

/** Stable Stripe coupon id so checkout reuses one forever 30% coupon. */
const SITEWIDE_COUPON_ID = "celpip_plans_30_off";

function couponDiscountCents(
  coupon: Stripe.Coupon,
  unitAmountCents: number | null,
): number | null {
  if (typeof coupon.percent_off === "number") {
    if (unitAmountCents == null) return null;
    return unitAmountCents - discountedUnitAmountCents(unitAmountCents, coupon.percent_off);
  }
  if (typeof coupon.amount_off === "number") {
    return coupon.amount_off;
  }
  return null;
}

async function loadCoupon(
  couponOrId: string | Stripe.Coupon,
): Promise<Stripe.Coupon | null> {
  try {
    return typeof couponOrId === "string"
      ? await stripe.coupons.retrieve(couponOrId)
      : couponOrId;
  } catch {
    return null;
  }
}

/** True when this promotion saves more than the sitewide 30% on this price. */
export async function promotionBeatsSitewideDiscount(
  promotionCodeId: string,
  unitAmountCents: number | null,
): Promise<boolean> {
  try {
    const promotion = await stripe.promotionCodes.retrieve(promotionCodeId);
    const coupon = await loadCoupon(promotion.coupon);
    if (!coupon) return false;
    return couponBeatsSitewideDiscount(coupon, unitAmountCents);
  } catch {
    return false;
  }
}

export async function couponIdBeatsSitewideDiscount(
  couponId: string,
  unitAmountCents: number | null,
): Promise<boolean> {
  const coupon = await loadCoupon(couponId);
  if (!coupon) return false;
  return couponBeatsSitewideDiscount(coupon, unitAmountCents);
}

function couponBeatsSitewideDiscount(
  coupon: Stripe.Coupon,
  unitAmountCents: number | null,
): boolean {
  const otherOff = couponDiscountCents(coupon, unitAmountCents);
  if (otherOff == null || unitAmountCents == null) {
    return typeof coupon.percent_off === "number" &&
      coupon.percent_off > SITEWIDE_PLAN_DISCOUNT_PERCENT;
  }
  const sitewideOff = unitAmountCents - discountedUnitAmountCents(unitAmountCents);
  return otherOff > sitewideOff;
}

export async function resolveSitewidePlanCouponId(): Promise<string> {
  try {
    const existing = await stripe.coupons.retrieve(SITEWIDE_COUPON_ID);
    if (
      existing.percent_off === SITEWIDE_PLAN_DISCOUNT_PERCENT &&
      existing.duration === "forever" &&
      existing.valid !== false
    ) {
      return existing.id;
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "resource_missing") throw error;
  }

  try {
    const created = await stripe.coupons.create({
      id: SITEWIDE_COUPON_ID,
      percent_off: SITEWIDE_PLAN_DISCOUNT_PERCENT,
      duration: "forever",
      name: "30% off all plans",
      metadata: { source: "sitewide_plan_discount" },
    });
    return created.id;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "resource_already_exists") throw error;
    const existing = await stripe.coupons.retrieve(SITEWIDE_COUPON_ID);
    return existing.id;
  }
}

export type CheckoutDiscount =
  | { kind: "none" }
  | { kind: "sitewide"; couponId: string }
  | { kind: "promotion"; promotionCode: string }
  | { kind: "coupon"; couponId: string; source: string };

/**
 * When `applySitewide` is true, 30% off every plan. A referral, partner, or
 * campaign code is kept only when it saves more than 30% on this price.
 * When false, charge the list price unless that code is already attached.
 */
export async function resolveCheckoutDiscount(input: {
  promotionCode: string | null;
  unitAmountCents: number | null;
  alternateCouponId?: string | null;
  alternateCouponSource?: string;
  applySitewide?: boolean;
}): Promise<CheckoutDiscount> {
  const applySitewide = input.applySitewide !== false;

  if (!applySitewide) {
    if (input.promotionCode) {
      return { kind: "promotion", promotionCode: input.promotionCode };
    }
    const alternateId = input.alternateCouponId?.trim();
    if (alternateId) {
      return {
        kind: "coupon",
        couponId: alternateId,
        source: input.alternateCouponSource || "alternate",
      };
    }
    return { kind: "none" };
  }

  if (
    input.promotionCode &&
    (await promotionBeatsSitewideDiscount(input.promotionCode, input.unitAmountCents))
  ) {
    return { kind: "promotion", promotionCode: input.promotionCode };
  }

  const alternateId = input.alternateCouponId?.trim();
  if (
    alternateId &&
    (await couponIdBeatsSitewideDiscount(alternateId, input.unitAmountCents))
  ) {
    return {
      kind: "coupon",
      couponId: alternateId,
      source: input.alternateCouponSource || "alternate",
    };
  }

  return {
    kind: "sitewide",
    couponId: await resolveSitewidePlanCouponId(),
  };
}
