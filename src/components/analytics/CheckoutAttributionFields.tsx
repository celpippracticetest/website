"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HOME_AB_COOKIE } from "@/lib/homeAbTest";
import { UI_AB_COOKIE } from "@/lib/uiAbTest";
import {
  loadPendingGa4IdsFromStorage,
  persistPendingGa4Ids,
  resolveGa4BrowserIds,
} from "@/lib/ga4BrowserIds";

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

const STORAGE_KEY_BY_FIELD = {
  gclid: "pending_gclid",
  gbraid: "pending_gbraid",
  wbraid: "pending_wbraid",
  fbclid: "pending_fbclid",
  msclkid: "pending_msclkid",
  ttclid: "pending_ttclid",
  utm_source: "pending_utm_source",
  utm_medium: "pending_utm_medium",
  utm_campaign: "pending_utm_campaign",
  utm_content: "pending_utm_content",
  utm_term: "pending_utm_term",
  /** Stores `gad_campaignid` for Google Ads campaign-level joins. */
  google_ads_campaign_id: "pending_google_ads_campaign_id",
  entry_page: "pending_entry_page",
  referrer: "pending_referrer",
  attribution_session_id: "pending_attribution_session_id",
} as const;

const CHECKOUT_ATTRIBUTION_FIELDS = Object.keys(
  STORAGE_KEY_BY_FIELD
) as Array<keyof typeof STORAGE_KEY_BY_FIELD>;

type CheckoutAttributionState = Partial<
  Record<keyof typeof STORAGE_KEY_BY_FIELD, string>
>;

function readValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Key–value pairs to mirror a checkout POST (Stripe or PayPal create). */
export function useCheckoutAttributionPayload(): Record<string, string> {
  const searchParams = useSearchParams();
  const [fields, setFields] = useState<CheckoutAttributionState>({});
  const [homeAbVariant, setHomeAbVariant] = useState<string | null>(null);
  const [uiAbVariant, setUiAbVariant] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextFields: CheckoutAttributionState = {};

    for (const field of CHECKOUT_ATTRIBUTION_FIELDS) {
      const fromUrl =
        field === "google_ads_campaign_id"
          ? readValue(searchParams.get("google_ads_campaign_id")) ||
            readValue(searchParams.get("gad_campaignid"))
          : readValue(searchParams.get(field));
      const value =
        fromUrl || readValue(localStorage.getItem(STORAGE_KEY_BY_FIELD[field]));

      if (value) {
        nextFields[field] = value;
      }
    }

    setFields(nextFields);

    const escaped = HOME_AB_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${escaped}=(classic|passport|legacy)`)
    );
    setHomeAbVariant(m?.[1] ?? null);

    const uiEscaped = UI_AB_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const uiMatch = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${uiEscaped}=(classic|modern)`),
    );
    setUiAbVariant(uiMatch?.[1] ?? null);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    void (async () => {
      const resolved = await resolveGa4BrowserIds(MEASUREMENT_ID);
      if (cancelled || !resolved.clientId) return;
      persistPendingGa4Ids(resolved.clientId, resolved.sessionId);
      setFields((prev) => ({ ...prev }));
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const payload: Record<string, string> = {};
  for (const field of CHECKOUT_ATTRIBUTION_FIELDS) {
    const fromUrl =
      field === "google_ads_campaign_id"
        ? readValue(searchParams.get("google_ads_campaign_id")) ||
          readValue(searchParams.get("gad_campaignid"))
        : readValue(searchParams.get(field));
    const value = fromUrl || fields[field];
    if (value) payload[field] = value;
  }
  if (homeAbVariant) {
    payload.home_ab_variant = homeAbVariant;
  }
  if (uiAbVariant) {
    payload.site_ui_variant = uiAbVariant;
  }

  if (typeof window !== "undefined") {
    const { clientId, sessionId } = loadPendingGa4IdsFromStorage();
    if (clientId) payload.ga4_client_id = clientId;
    if (sessionId) payload.ga4_session_id = sessionId;
  }

  return payload;
}

export default function CheckoutAttributionFields() {
  const payload = useCheckoutAttributionPayload();

  return (
    <>
      {Object.entries(payload).map(([field, value]) => (
        <input key={field} type="hidden" name={field} value={value} />
      ))}
    </>
  );
}
