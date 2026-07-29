/**
 * Browser helper: send Meta CAPI beacon with the same event_id used in gtag/dataLayer.
 */

import { META_EVENT, type MetaStandardEventName } from "@/lib/meta-constants";

export type MetaCapiBeaconPayload = {
  eventName: MetaStandardEventName | string;
  eventId: string;
  eventSourceUrl?: string;
  email?: string;
  userId?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  fbclid?: string;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim()) || null;
  } catch {
    return match[1].trim() || null;
  }
}

function readPendingFbclid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("pending_fbclid")?.trim() || null;
  } catch {
    return null;
  }
}

export function newMetaClientEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
}

/** Fire-and-forget CAPI beacon (sendBeacon preferred). */
export function sendMetaCapiBeacon(payload: MetaCapiBeaconPayload): void {
  if (typeof window === "undefined") return;
  if (!payload.eventId?.trim() || !payload.eventName?.trim()) return;

  const body = JSON.stringify({
    eventName: payload.eventName,
    eventId: payload.eventId,
    eventSourceUrl:
      payload.eventSourceUrl ||
      (typeof window !== "undefined" ? window.location.href : undefined),
    email: payload.email,
    userId: payload.userId,
    value: payload.value,
    currency: payload.currency,
    contentIds: payload.contentIds,
    fbclid: payload.fbclid || readPendingFbclid() || undefined,
  });

  try {
    const url = "/api/meta/capi";
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    });
  } catch {
    // Ignore beacon failures (ad blockers, offline).
  }
}

export function sendMetaPageViewBeacon(eventId: string, userId?: string): void {
  sendMetaCapiBeacon({
    eventName: META_EVENT.PAGE_VIEW,
    eventId,
    userId,
  });
}

export function sendMetaCompleteRegistrationBeacon(args: {
  eventId: string;
  userId: string;
  email?: string;
}): void {
  sendMetaCapiBeacon({
    eventName: META_EVENT.COMPLETE_REGISTRATION,
    eventId: args.eventId,
    userId: args.userId,
    email: args.email,
    value: 1,
    currency: "CAD",
  });
}

/** Expose cookie readers for checkout attribution fields. */
export function readMetaPixelCookies(): { fbp: string | null; fbc: string | null } {
  return {
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
  };
}
