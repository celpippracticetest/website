import "server-only";

import { stripe } from "@/lib/stripe";

const YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Stripe customer-facing promotion `code` allows only a-z, A-Z, 0-9 (no hyphens).
 * We derive a code from the partner’s public code plus a short suffix for global uniqueness.
 */
export function stripePromotionCodeBaseFromPartnerCode(partnerCode: string): string {
  const base = partnerCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (base.length > 0 ? base : "PARTNER").slice(0, 28);
}

/**
 * One Stripe promotion per referee (max_redemptions: 1). Coupon metadata stores the real partner code.
 */
export async function createPartnerRefereeStripeDiscount(input: {
  partnerRecordId: string;
  partnerDisplayCode: string;
  clerkUserId: string;
  discountPercent: number;
}): Promise<{ promotionId: string; stripePromotionCustomerCode: string }> {
  const pct = Math.min(100, Math.max(0, Math.round(input.discountPercent)));
  const base = stripePromotionCodeBaseFromPartnerCode(input.partnerDisplayCode);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const visibleCode = `${base}${suffix}`.slice(0, 40);

  const coupon = await stripe.coupons.create({
    name: `Partner referee ${input.partnerDisplayCode}`.slice(0, 40),
    percent_off: pct,
    duration: "once",
    redeem_by: Math.floor(Date.now() / 1000) + YEAR_SECONDS,
    metadata: {
      kind: "partner_referee",
      partnerId: input.partnerRecordId,
      partnerCode: input.partnerDisplayCode,
      subscriberClerkUserId: input.clerkUserId,
    },
  });

  const promotion = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: visibleCode,
    max_redemptions: 1,
    active: true,
    metadata: {
      kind: "partner_referee",
      partnerId: input.partnerRecordId,
      partnerCode: input.partnerDisplayCode,
      subscriberClerkUserId: input.clerkUserId,
    },
  });

  return {
    promotionId: promotion.id,
    stripePromotionCustomerCode: visibleCode,
  };
}
