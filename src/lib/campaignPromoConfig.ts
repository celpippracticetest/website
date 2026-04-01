import type { NextRequest, NextResponse } from "next/server";

/** HttpOnly cookie set when a user lands with `?promo=<campaign key>` (e.g. Google Ads). */
export const CAMPAIGN_PROMO_COOKIE = "celpip_campaign_promo";

/** Query param name for campaign keys (e.g. `/pricing?promo=easter2026`). */
export const ADS_PROMO_QUERY_PARAM = "promo";

export type AdsPromoCampaign = {
  key: string;
  /** Stripe Promotion Code id, e.g. `promo_xxx` */
  promotionCodeId: string;
  /** ISO datetime when the sale ends (cookie and server checks). */
  endsAt: string;
  /** Optional cap: eligibility expires this many days after first capture (default 14). */
  maxCookieDays?: number;
};

function parseCampaignsJson(raw: string | undefined): AdsPromoCampaign[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: AdsPromoCampaign[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const key = typeof o.key === "string" ? o.key.trim() : "";
      const promotionCodeId =
        typeof o.promotionCodeId === "string" ? o.promotionCodeId.trim() : "";
      const endsAt = typeof o.endsAt === "string" ? o.endsAt.trim() : "";
      const maxCookieDays =
        typeof o.maxCookieDays === "number" && o.maxCookieDays > 0
          ? o.maxCookieDays
          : undefined;
      if (
        !key ||
        !/^[-a-zA-Z0-9_]+$/.test(key) ||
        !promotionCodeId ||
        !/^promo_[a-zA-Z0-9]+$/.test(promotionCodeId) ||
        !endsAt
      ) {
        continue;
      }
      const ends = new Date(endsAt);
      if (Number.isNaN(ends.getTime())) continue;
      out.push({
        key,
        promotionCodeId,
        endsAt,
        ...(maxCookieDays !== undefined ? { maxCookieDays } : {}),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function getAdsPromoCampaigns(): AdsPromoCampaign[] {
  return parseCampaignsJson(process.env.ADS_PROMO_CAMPAIGNS);
}

export function findAdsPromoCampaign(key: string): AdsPromoCampaign | null {
  const k = key.trim().toLowerCase();
  if (!k) return null;
  for (const c of getAdsPromoCampaigns()) {
    if (c.key.toLowerCase() === k) return c;
  }
  return null;
}

const DEFAULT_MAX_COOKIE_DAYS = 14;

export function computeCampaignCookieExpiresAtMs(
  campaign: AdsPromoCampaign,
  nowMs: number
): number {
  const campaignEnd = new Date(campaign.endsAt).getTime();
  const maxDays = campaign.maxCookieDays ?? DEFAULT_MAX_COOKIE_DAYS;
  const capByDays = nowMs + maxDays * 24 * 60 * 60 * 1000;
  return Math.min(campaignEnd, capByDays);
}

/**
 * Cookie payload: `promo_xxx|<expiresAtMs>|<campaignKey>` — Stripe ids do not contain `|`.
 */
export function serializeCampaignPromoCookie(
  campaign: AdsPromoCampaign,
  expiresAtMs: number
): string {
  return `${campaign.promotionCodeId}|${Math.floor(expiresAtMs)}|${campaign.key}`;
}

export function parseCampaignPromoCookie(
  raw: string | undefined | null
): { promotionCodeId: string; expiresAtMs: number; campaignKey: string } | null {
  if (!raw?.trim()) return null;
  const parts = raw.split("|");
  if (parts.length !== 3) return null;
  const [promotionCodeId, expStr, campaignKey] = parts;
  if (!promotionCodeId || !/^promo_[a-zA-Z0-9]+$/.test(promotionCodeId)) {
    return null;
  }
  const expiresAtMs = Number.parseInt(expStr, 10);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) return null;
  if (!campaignKey || !/^[-a-zA-Z0-9_]+$/.test(campaignKey)) return null;
  return { promotionCodeId, expiresAtMs, campaignKey };
}

/**
 * When the URL contains `?promo=<key>`, set HttpOnly cookie so checkout can apply the Stripe promotion
 * after the user returns later (used from `src/proxy.ts` with Clerk).
 */
export function applyCampaignPromoToResponse(
  req: NextRequest,
  response: NextResponse
): NextResponse {
  const promoKey = req.nextUrl.searchParams.get(ADS_PROMO_QUERY_PARAM)?.trim();
  if (!promoKey) return response;

  const campaign = findAdsPromoCampaign(promoKey);
  if (!campaign) return response;

  const now = Date.now();
  if (new Date(campaign.endsAt).getTime() <= now) return response;

  const existing = req.cookies.get(CAMPAIGN_PROMO_COOKIE)?.value;
  const parsed = parseCampaignPromoCookie(existing);
  if (
    parsed &&
    parsed.campaignKey.toLowerCase() === promoKey.toLowerCase() &&
    parsed.expiresAtMs > now
  ) {
    return response;
  }

  const expiresAtMs = computeCampaignCookieExpiresAtMs(campaign, now);
  const maxAgeSec = Math.floor((expiresAtMs - now) / 1000);
  if (maxAgeSec <= 0) return response;

  response.cookies.set(
    CAMPAIGN_PROMO_COOKIE,
    serializeCampaignPromoCookie(campaign, expiresAtMs),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSec,
    }
  );
  return response;
}
