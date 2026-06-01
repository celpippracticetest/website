import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { stripePromotionCodeIsUsable } from "@/lib/campaignPromo";

export type PromoDiscountDisplay = {
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
};

export type ResolvePromotionCodeResult =
  | {
      promotionCodeId: string;
      discountLabel: string;
      discount: PromoDiscountDisplay;
    }
  | { error: string };

export function formatPromoDiscountLabel(discount: PromoDiscountDisplay): string {
  if (discount.percentOff != null && Number.isFinite(discount.percentOff)) {
    return `${Math.round(discount.percentOff)}% off`;
  }
  if (discount.amountOff != null && Number.isFinite(discount.amountOff)) {
    const amount = discount.amountOff / 100;
    const currency = (discount.currency ?? "cad").toUpperCase();
    const prefix = currency === "CAD" ? "CA$" : `${currency} `;
    return `${prefix}${amount.toFixed(2)} off`;
  }
  return "Discount applied";
}

function promoDiscountFromCoupon(coupon: Stripe.Coupon): PromoDiscountDisplay {
  return {
    percentOff:
      coupon.percent_off != null && Number.isFinite(coupon.percent_off)
        ? coupon.percent_off
        : null,
    amountOff:
      coupon.amount_off != null && Number.isFinite(coupon.amount_off)
        ? coupon.amount_off
        : null,
    currency: coupon.currency ?? null,
  };
}

async function getCouponForPromotion(promotionCodeId: string): Promise<Stripe.Coupon | null> {
  try {
    const promotion = await stripe.promotionCodes.retrieve(promotionCodeId);
    if (typeof promotion.coupon === "string") {
      return await stripe.coupons.retrieve(promotion.coupon);
    }
    return promotion.coupon ?? null;
  } catch {
    return null;
  }
}
/**
 * Resolve a customer-facing Stripe promotion code (e.g. SAVE20) to a promotion code id.
 */
export async function resolvePromotionCodeByCustomerCode(
  customerCode: string,
): Promise<ResolvePromotionCodeResult> {
  const normalized = customerCode.trim();
  if (!normalized) {
    return { error: "Enter a promo code" };
  }

  const candidates = [normalized, normalized.toUpperCase()];
  const tried = new Set<string>();

  for (const code of candidates) {
    if (tried.has(code)) continue;
    tried.add(code);

    try {
      const list = await stripe.promotionCodes.list({
        code,
        active: true,
        limit: 1,
      });
      const promotion = list.data[0];
      if (!promotion?.id) {
        continue;
      }
      const usable = await stripePromotionCodeIsUsable(promotion.id);
      if (!usable) {
        return { error: "This promo code has expired" };
      }
      const coupon = await getCouponForPromotion(promotion.id);
      const discount = coupon
        ? promoDiscountFromCoupon(coupon)
        : { percentOff: null, amountOff: null, currency: null };
      return {
        promotionCodeId: promotion.id,
        discount,
        discountLabel: formatPromoDiscountLabel(discount),
      };    } catch {
      continue;
    }
  }

  return { error: "This promo code is not valid" };
}

export async function resolveManualPromoPromotionCodeId(
  customerCode: string | null | undefined,
): Promise<string | null> {
  if (!customerCode?.trim()) {
    return null;
  }
  const result = await resolvePromotionCodeByCustomerCode(customerCode);
  return "promotionCodeId" in result ? result.promotionCodeId : null;
}
