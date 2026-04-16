"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEYS = {
  gclid: "pending_gclid",
  gbraid: "pending_gbraid",
  wbraid: "pending_wbraid",
  fbclid: "pending_fbclid",
  msclkid: "pending_msclkid",
  ttclid: "pending_ttclid",
  utmSource: "pending_utm_source",
  utmMedium: "pending_utm_medium",
  utmCampaign: "pending_utm_campaign",
  utmContent: "pending_utm_content",
  utmTerm: "pending_utm_term",
  entryPage: "pending_entry_page",
  referrer: "pending_referrer",
  sessionId: "pending_attribution_session_id",
} as const;

function readParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getOrCreateAttributionSessionId(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.sessionId);
  if (existing) return existing;

  const sessionId = `attr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(STORAGE_KEYS.sessionId, sessionId);
  return sessionId;
}

function persistAttributionFromUrl(pathname: string, searchParams: URLSearchParams) {
  const gclid = readParam(searchParams.get("gclid"));
  const gbraid = readParam(searchParams.get("gbraid"));
  const wbraid = readParam(searchParams.get("wbraid"));
  const fbclid = readParam(searchParams.get("fbclid"));
  const msclkid = readParam(searchParams.get("msclkid"));
  const ttclid = readParam(searchParams.get("ttclid"));
  const utmSource = readParam(searchParams.get("utm_source"));
  const utmMedium = readParam(searchParams.get("utm_medium"));
  const utmCampaign = readParam(searchParams.get("utm_campaign"));
  const utmContent = readParam(searchParams.get("utm_content"));
  const utmTerm = readParam(searchParams.get("utm_term"));

  if (gclid) localStorage.setItem(STORAGE_KEYS.gclid, gclid);
  if (gbraid) localStorage.setItem(STORAGE_KEYS.gbraid, gbraid);
  if (wbraid) localStorage.setItem(STORAGE_KEYS.wbraid, wbraid);
  if (fbclid) localStorage.setItem(STORAGE_KEYS.fbclid, fbclid);
  if (msclkid) localStorage.setItem(STORAGE_KEYS.msclkid, msclkid);
  if (ttclid) localStorage.setItem(STORAGE_KEYS.ttclid, ttclid);
  if (utmSource) localStorage.setItem(STORAGE_KEYS.utmSource, utmSource);
  if (utmMedium) localStorage.setItem(STORAGE_KEYS.utmMedium, utmMedium);
  if (utmCampaign) localStorage.setItem(STORAGE_KEYS.utmCampaign, utmCampaign);
  if (utmContent) localStorage.setItem(STORAGE_KEYS.utmContent, utmContent);
  if (utmTerm) localStorage.setItem(STORAGE_KEYS.utmTerm, utmTerm);

  if (!localStorage.getItem(STORAGE_KEYS.entryPage)) {
    const query = searchParams.toString();
    const entryPage = `${pathname}${query ? `?${query}` : ""}`;
    localStorage.setItem(STORAGE_KEYS.entryPage, entryPage);
  }

  if (!localStorage.getItem(STORAGE_KEYS.referrer) && document.referrer) {
    localStorage.setItem(STORAGE_KEYS.referrer, document.referrer);
  }

  getOrCreateAttributionSessionId();
}

export default function AttributionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    persistAttributionFromUrl(pathname || "/", searchParams);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isSignedIn || !userId) return;

    const payload = {
      gclid: localStorage.getItem(STORAGE_KEYS.gclid),
      gbraid: localStorage.getItem(STORAGE_KEYS.gbraid),
      wbraid: localStorage.getItem(STORAGE_KEYS.wbraid),
      fbclid: localStorage.getItem(STORAGE_KEYS.fbclid),
      msclkid: localStorage.getItem(STORAGE_KEYS.msclkid),
      ttclid: localStorage.getItem(STORAGE_KEYS.ttclid),
      utm_source: localStorage.getItem(STORAGE_KEYS.utmSource),
      utm_medium: localStorage.getItem(STORAGE_KEYS.utmMedium),
      utm_campaign: localStorage.getItem(STORAGE_KEYS.utmCampaign),
      utm_content: localStorage.getItem(STORAGE_KEYS.utmContent),
      utm_term: localStorage.getItem(STORAGE_KEYS.utmTerm),
      entryPage: localStorage.getItem(STORAGE_KEYS.entryPage),
      referrer: localStorage.getItem(STORAGE_KEYS.referrer),
      sessionId: getOrCreateAttributionSessionId(),
    };

    const hasAttributionData =
      Boolean(payload.gclid) ||
      Boolean(payload.gbraid) ||
      Boolean(payload.wbraid) ||
      Boolean(payload.fbclid) ||
      Boolean(payload.msclkid) ||
      Boolean(payload.ttclid) ||
      Boolean(payload.utm_source) ||
      Boolean(payload.utm_medium) ||
      Boolean(payload.utm_campaign) ||
      Boolean(payload.utm_content) ||
      Boolean(payload.utm_term) ||
      Boolean(payload.entryPage);

    if (!hasAttributionData) return;

    const sessionDedupeKey = `attribution_last_sent_${userId}`;
    const payloadSignature = JSON.stringify(payload);
    if (sessionStorage.getItem(sessionDedupeKey) === payloadSignature) return;

    fetch("/api/users/update-attribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) return;
        sessionStorage.setItem(sessionDedupeKey, payloadSignature);
      })
      .catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Attribution] Failed to update attribution", error);
        }
      });
  }, [isSignedIn, userId, pathname, searchParams]);

  return null;
}
