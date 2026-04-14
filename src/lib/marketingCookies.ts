import type { NextRequest, NextResponse } from "next/server";
import { applyAcquisitionAttributionCookie } from "@/lib/attributionCookie";
import { applyCampaignPromoToResponse } from "@/lib/campaignPromoConfig";

/** Apply promo + first-touch acquisition cookies before returning from middleware. */
export function applyMarketingCookiesToResponse(
  req: NextRequest,
  response: NextResponse
): NextResponse {
  applyAcquisitionAttributionCookie(req, response);
  return applyCampaignPromoToResponse(req, response);
}
