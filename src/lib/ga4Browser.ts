/** Send GA4 events directly via gtag (no GTM). */
import { GA4_MEASUREMENT_ID } from "@/lib/ga4-constants";

const DEBUG = process.env.NODE_ENV === "development";

const GA4_EVENTS_BLOCKED = new Set([
  "consent_update",
  "default_consent",
  // Ads/Meta only — must never mirror into GA4
  "ads_enhanced_conversion",
]);

const GA4_STRIP_KEYS = new Set([
  "event",
  "user_data",
  "google_ads_send_to",
  "conversion_label",
  "conversion_name",
  "ecommerce",
  "timestamp",
]);

type Ga4Primitive = string | number | boolean;
type Ga4ItemParam = Record<string, Ga4Primitive>;
type Ga4ParamValue = Ga4Primitive | Ga4ItemParam[];

type QueuedGa4Event = {
  eventName: string;
  params: Record<string, unknown>;
};

const eventQueue: QueuedGa4Event[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushAttempts = 0;
const MAX_FLUSH_ATTEMPTS = 40;

function getMeasurementId(): string | null {
  return GA4_MEASUREMENT_ID;
}

function getGtag(): ((...args: unknown[]) => void) | null {
  if (typeof window === "undefined") return null;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  return typeof gtag === "function" ? gtag : null;
}

function flattenEventForGa4(event: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const ecommerce = event.ecommerce;
  if (ecommerce && typeof ecommerce === "object" && !Array.isArray(ecommerce)) {
    for (const [key, value] of Object.entries(ecommerce as Record<string, unknown>)) {
      if (value !== undefined && value !== null) {
        out[key] = value;
      }
    }
  }

  for (const [key, value] of Object.entries(event)) {
    if (GA4_STRIP_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (key === "value" || key === "currency" || key === "transaction_id") {
      out[key] = value;
      continue;
    }
    if (!(key in out)) {
      out[key] = value;
    }
  }

  return out;
}

function sanitizeGa4Value(key: string, value: unknown): Ga4ParamValue | undefined {
  if (value === undefined || value === null) return undefined;

  if (key === "items" && Array.isArray(value)) {
    const items = value
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const item: Ga4ItemParam = {};
        for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
          const sanitized = sanitizeGa4Value(k, v);
          if (sanitized !== undefined && !Array.isArray(sanitized)) {
            item[k] = sanitized;
          }
        }
        return Object.keys(item).length ? item : null;
      })
      .filter((row): row is Ga4ItemParam => Boolean(row));
    return items.length ? items : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 500) : undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "boolean") return value;
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return value.join(",");
  }
  return undefined;
}

function sanitizeGa4Params(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    const sanitized = sanitizeGa4Value(key, value);
    if (sanitized !== undefined) {
      out[key] = sanitized;
    }
  }
  return out;
}

function dispatchGa4Event(eventName: string, params: Record<string, unknown>): boolean {
  const gtag = getGtag();
  const measurementId = getMeasurementId();
  if (!gtag || !measurementId) return false;

  if (DEBUG) {
    console.log("[GA4]", eventName, params);
  }

  try {
    gtag("event", eventName, params);
    return true;
  } catch (error) {
    if (DEBUG) {
      console.warn("[GA4] gtag event failed:", eventName, error);
    }
    return false;
  }
}

function scheduleFlush(): void {
  if (typeof window === "undefined") return;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueuedEvents();
  }, 250);
}

function flushQueuedEvents(): void {
  if (eventQueue.length === 0) return;
  const gtag = getGtag();
  if (!gtag) {
    flushAttempts += 1;
    if (flushAttempts < MAX_FLUSH_ATTEMPTS) {
      scheduleFlush();
    }
    return;
  }

  flushAttempts = 0;
  while (eventQueue.length > 0) {
    const next = eventQueue.shift();
    if (!next) break;
    if (!dispatchGa4Event(next.eventName, next.params)) {
      eventQueue.unshift(next);
      scheduleFlush();
      break;
    }
  }
}

/** Send an app analytics event to GA4 via gtag. */
export function sendGa4Event(event: Record<string, unknown>): void {
  const eventName = typeof event.event === "string" ? event.event : "";
  if (!eventName || GA4_EVENTS_BLOCKED.has(eventName)) return;
  if (eventName === "gtm.js" || eventName.startsWith("gtm.")) return;

  const measurementId = getMeasurementId();
  if (!measurementId) return;

  const params = sanitizeGa4Params(flattenEventForGa4(event));

  if (eventName === "page_view" && typeof window !== "undefined") {
    if (!params.page_location) {
      params.page_location = window.location.href;
    }
    if (!params.page_path && window.location.pathname) {
      params.page_path = `${window.location.pathname}${window.location.search}`;
    }
  }

  if (!dispatchGa4Event(eventName, params)) {
    eventQueue.push({ eventName, params });
    scheduleFlush();
  }
}

export function updateGa4Consent(consentState: {
  ad_storage?: "granted" | "denied";
  analytics_storage?: "granted" | "denied";
  ad_user_data?: "granted" | "denied";
  ad_personalization?: "granted" | "denied";
}): void {
  const gtag = getGtag();
  if (!gtag) return;

  try {
    gtag("consent", "update", consentState);
  } catch (error) {
    if (DEBUG) {
      console.warn("[GA4] consent update failed:", error);
    }
  }
}

/** Set GA4 user_id on the config tag when auth state changes. */
export function setGa4UserId(userId: string | null | undefined): void {
  const gtag = getGtag();
  const measurementId = getMeasurementId();
  if (!gtag || !measurementId) return;

  try {
    if (userId) {
      gtag("config", measurementId, { user_id: userId });
    } else {
      gtag("config", measurementId, { user_id: undefined });
    }
  } catch (error) {
    if (DEBUG) {
      console.warn("[GA4] set user_id failed:", error);
    }
  }
}

/** Set GA4 user-scoped custom dimensions (e.g. experiment arms). */
export function setGa4UserProperties(
  properties: Record<string, string | undefined>,
): void {
  const gtag = getGtag();
  if (!gtag) return;

  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    const trimmed = value?.trim();
    if (trimmed) {
      cleaned[key] = trimmed.slice(0, 36);
    }
  }
  if (Object.keys(cleaned).length === 0) return;

  try {
    gtag("set", "user_properties", cleaned);
  } catch (error) {
    if (DEBUG) {
      console.warn("[GA4] set user_properties failed:", error);
    }
  }
}
