import type { NextRequest } from "next/server";

import { stripe } from "@/lib/stripe";

import {
  CAMPAIGN_PROMO_COOKIE,
  parseCampaignPromoCookie,
} from "@/lib/campaignPromoConfig";

export type { AdsPromoCampaign } from "@/lib/campaignPromoConfig";
export {
  ADS_PROMO_QUERY_PARAM,
  CAMPAIGN_PROMO_COOKIE,
  computeCampaignCookieExpiresAtMs,
  findAdsPromoCampaign,
  getAdsPromoCampaigns,
  parseCampaignPromoCookie,
  serializeCampaignPromoCookie,
} from "@/lib/campaignPromoConfig";

export async function stripePromotionCodeIsUsable(
  promotionCodeId: string
): Promise<boolean> {
  try {
    const pc = await stripe.promotionCodes.retrieve(promotionCodeId);
    if (!pc.active) return false;
    const coupon =
      typeof pc.coupon === "string"
        ? await stripe.coupons.retrieve(pc.coupon)
        : pc.coupon;
    if (coupon.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a Stripe promotion code id from the campaign cookie (after referral logic).
 */
export async function resolveCampaignPromoFromRequest(request: NextRequest): Promise<{
  promotionCode: string | null;
  campaignKey: string | null;
}> {
  const raw = request.cookies.get(CAMPAIGN_PROMO_COOKIE)?.value;
  const parsed = parseCampaignPromoCookie(raw);
  if (!parsed || parsed.expiresAtMs <= Date.now()) {
    return { promotionCode: null, campaignKey: null };
  }
  const ok = await stripePromotionCodeIsUsable(parsed.promotionCodeId);
  if (!ok) {
    return { promotionCode: null, campaignKey: null };
  }
  return {
    promotionCode: parsed.promotionCodeId,
    campaignKey: parsed.campaignKey,
  };
}
