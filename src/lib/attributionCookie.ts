import type { NextRequest, NextResponse } from "next/server";

/** First-touch UTM / gclid from landing URL; set by middleware, read by API routes. */
export const ACQUISITION_ATTRIBUTION_COOKIE = "celpip_acq";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90; // 90 days
const MAX_FIELD_LEN = 512;
const MAX_ENTRY_LEN = 2048;

export type AcquisitionAttributionV1 = {
  v: 1;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** Google Ads campaign ID from `gad_campaignid` (joins to Ads + GA4). */
  google_ads_campaign_id?: string;
  /** Path + query of the request that set the cookie (first campaign landing). */
  entry_page?: string;
  captured_at: string;
};

function trimParam(value: string | null): string | undefined {
  if (!value) return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.length > MAX_FIELD_LEN ? t.slice(0, MAX_FIELD_LEN) : t;
}

function hasAcquisitionQuery(params: URLSearchParams): boolean {
  return Boolean(
    trimParam(params.get("gclid")) ||
      trimParam(params.get("gbraid")) ||
      trimParam(params.get("wbraid")) ||
      trimParam(params.get("gad_campaignid")) ||
      trimParam(params.get("fbclid")) ||
      trimParam(params.get("msclkid")) ||
      trimParam(params.get("ttclid")) ||
      trimParam(params.get("utm_source")) ||
      trimParam(params.get("utm_medium")) ||
      trimParam(params.get("utm_campaign")) ||
      trimParam(params.get("utm_content")) ||
      trimParam(params.get("utm_term"))
  );
}

function hasStoredAcquisition(p: AcquisitionAttributionV1): boolean {
  return Boolean(
    p.gclid ||
      p.gbraid ||
      p.wbraid ||
      p.google_ads_campaign_id ||
      p.fbclid ||
      p.msclkid ||
      p.ttclid ||
      p.utm_source ||
      p.utm_medium ||
      p.utm_campaign ||
      p.utm_content ||
      p.utm_term
  );
}

export function parseAcquisitionAttributionCookie(
  raw: string | undefined | null
): AcquisitionAttributionV1 | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Partial<AcquisitionAttributionV1>;
    if (o?.v !== 1 || typeof o.captured_at !== "string") return null;
    return o as AcquisitionAttributionV1;
  } catch {
    return null;
  }
}

/**
 * On first GET with utm_* / gclid, set HttpOnly cookie (first-touch only).
 */
export function applyAcquisitionAttributionCookie(
  req: NextRequest,
  response: NextResponse
): void {
  if (req.method !== "GET") return;
  const path = req.nextUrl.pathname;
  if (path.startsWith("/_next") || path.startsWith("/api/")) return;

  const sp = req.nextUrl.searchParams;
  if (!hasAcquisitionQuery(sp)) return;

  const existing = parseAcquisitionAttributionCookie(
    req.cookies.get(ACQUISITION_ATTRIBUTION_COOKIE)?.value
  );
  if (existing && hasStoredAcquisition(existing)) return;

  const payload: AcquisitionAttributionV1 = {
    v: 1,
    captured_at: new Date().toISOString(),
    gclid: trimParam(sp.get("gclid")),
    gbraid: trimParam(sp.get("gbraid")),
    wbraid: trimParam(sp.get("wbraid")),
    google_ads_campaign_id: trimParam(sp.get("gad_campaignid")),
    fbclid: trimParam(sp.get("fbclid")),
    msclkid: trimParam(sp.get("msclkid")),
    ttclid: trimParam(sp.get("ttclid")),
    utm_source: trimParam(sp.get("utm_source")),
    utm_medium: trimParam(sp.get("utm_medium")),
    utm_campaign: trimParam(sp.get("utm_campaign")),
    utm_content: trimParam(sp.get("utm_content")),
    utm_term: trimParam(sp.get("utm_term")),
  };

  const fullEntry = `${path}${req.nextUrl.search}`;
  payload.entry_page =
    fullEntry.length <= MAX_ENTRY_LEN ? fullEntry : fullEntry.slice(0, MAX_ENTRY_LEN);

  let serialized = JSON.stringify(payload);
  if (serialized.length > 3800) {
    const { entry_page: _e, ...rest } = payload;
    serialized = JSON.stringify(rest);
  }

  response.cookies.set(ACQUISITION_ATTRIBUTION_COOKIE, serialized, {
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}

/** Merge cookie first-touch into a flat attribution payload (body wins if both set). */
export function mergeAcquisitionCookieIntoAttributionData(
  cookieRaw: string | undefined | null,
  data: Record<string, string>
): void {
  const c = parseAcquisitionAttributionCookie(cookieRaw);
  if (!c) return;

  const pick = (key: keyof AcquisitionAttributionV1) => {
    if (key === "v" || key === "captured_at") return;
    const v = c[key];
    if (typeof v !== "string" || !v.trim()) return;
    const k = key as string;
    if (!data[k]) data[k] = v;
  };

  pick("gclid");
  pick("gbraid");
  pick("wbraid");
  pick("fbclid");
  pick("msclkid");
  pick("ttclid");
  pick("utm_source");
  pick("utm_medium");
  pick("utm_campaign");
  pick("utm_content");
  pick("utm_term");
  pick("google_ads_campaign_id");
  if (!data.entryPage && c.entry_page?.trim()) {
    data.entryPage = c.entry_page.trim();
  }
}

export type AcquisitionCookieFlat = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  google_ads_campaign_id: string | null;
  fbclid: string | null;
  msclkid: string | null;
  ttclid: string | null;
  entry_page: string | null;
};

export function flatAcquisitionFromCookie(
  cookieRaw: string | undefined | null
): AcquisitionCookieFlat {
  const c = parseAcquisitionAttributionCookie(cookieRaw);
  if (!c) {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      gclid: null,
      gbraid: null,
      wbraid: null,
      google_ads_campaign_id: null,
      fbclid: null,
      msclkid: null,
      ttclid: null,
      entry_page: null,
    };
  }
  return {
    utm_source: c.utm_source?.trim() || null,
    utm_medium: c.utm_medium?.trim() || null,
    utm_campaign: c.utm_campaign?.trim() || null,
    utm_content: c.utm_content?.trim() || null,
    utm_term: c.utm_term?.trim() || null,
    gclid: c.gclid?.trim() || null,
    gbraid: c.gbraid?.trim() || null,
    wbraid: c.wbraid?.trim() || null,
    google_ads_campaign_id: c.google_ads_campaign_id?.trim() || null,
    fbclid: c.fbclid?.trim() || null,
    msclkid: c.msclkid?.trim() || null,
    ttclid: c.ttclid?.trim() || null,
    entry_page: c.entry_page?.trim() || null,
  };
}
