import { createHash } from "node:crypto";
import {
  META_GRAPH_VERSION,
  META_PIXEL_ID,
  type MetaStandardEventName,
} from "@/lib/meta-constants";

type MetaPrimitive = string | number | boolean;

export type MetaCapiUserData = {
  email?: string | null;
  externalId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
};

export type MetaCapiCustomData = {
  value?: number | null;
  currency?: string | null;
  contentIds?: string[] | null;
  contentType?: string | null;
  orderId?: string | null;
  contents?: Array<Record<string, MetaPrimitive>> | null;
};

export type MetaCapiEvent = {
  eventName: MetaStandardEventName | string;
  eventId: string;
  eventSourceUrl?: string | null;
  eventTime?: number;
  actionSource?: "website" | "email" | "app" | "phone_call" | "chat" | "other";
  userData?: MetaCapiUserData;
  customData?: MetaCapiCustomData;
};

export type SendMetaCapiEventsInput = {
  events: MetaCapiEvent[];
};

function getMetaCapiConfig(): {
  pixelId: string;
  accessToken: string;
  graphVersion: string;
  testEventCode: string | null;
} | null {
  const pixelId = META_PIXEL_ID;
  // Prefer shared Meta Marketing API token; optional CAPI-only override.
  const accessToken =
    process.env.META_ACCESS_TOKEN?.trim() ||
    process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) return null;
  return {
    pixelId,
    accessToken,
    graphVersion: META_GRAPH_VERSION,
    testEventCode: process.env.META_TEST_EVENT_CODE?.trim() || null,
  };
}

/** Normalize + SHA-256 hash for Meta advanced matching (email, external_id, etc.). */
export function hashMetaPii(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash("sha256").update(normalized).digest("hex");
}

export function buildMetaFbcFromFbclid(
  fbclid: string | null | undefined,
  capturedAtMs: number = Date.now()
): string | undefined {
  const id = fbclid?.trim();
  if (!id) return undefined;
  return `fb.1.${Math.floor(capturedAtMs)}.${id}`;
}

/** Parse `_fbp` / `_fbc` from a Cookie header or cookie map. */
export function readMetaBrowserCookies(
  cookieHeaderOrMap: string | null | undefined | Map<string, string> | Record<string, string>
): { fbp?: string; fbc?: string } {
  const get = (name: string): string | undefined => {
    if (!cookieHeaderOrMap) return undefined;
    if (typeof cookieHeaderOrMap === "string") {
      const match = cookieHeaderOrMap.match(
        new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
      );
      const raw = match?.[1];
      if (!raw) return undefined;
      try {
        return decodeURIComponent(raw.trim()) || undefined;
      } catch {
        return raw.trim() || undefined;
      }
    }
    if (cookieHeaderOrMap instanceof Map) {
      return cookieHeaderOrMap.get(name)?.trim() || undefined;
    }
    return cookieHeaderOrMap[name]?.trim() || undefined;
  };

  return {
    fbp: get("_fbp"),
    fbc: get("_fbc"),
  };
}

function resolveFbc(userData?: MetaCapiUserData): string | undefined {
  const existing = userData?.fbc?.trim();
  if (existing) return existing;
  return buildMetaFbcFromFbclid(userData?.fbclid);
}

function sanitizeCustomData(
  customData?: MetaCapiCustomData
): Record<string, unknown> | undefined {
  if (!customData) return undefined;
  const out: Record<string, unknown> = {};

  if (
    typeof customData.value === "number" &&
    Number.isFinite(customData.value)
  ) {
    out.value = customData.value;
  }
  if (typeof customData.currency === "string" && customData.currency.trim()) {
    out.currency = customData.currency.trim().toUpperCase();
  }
  if (Array.isArray(customData.contentIds) && customData.contentIds.length) {
    out.content_ids = customData.contentIds
      .map((id) => String(id).trim())
      .filter(Boolean)
      .slice(0, 50);
  }
  if (typeof customData.contentType === "string" && customData.contentType.trim()) {
    out.content_type = customData.contentType.trim();
  }
  if (typeof customData.orderId === "string" && customData.orderId.trim()) {
    out.order_id = customData.orderId.trim();
  }
  if (Array.isArray(customData.contents) && customData.contents.length) {
    out.contents = customData.contents.slice(0, 50);
  }

  return Object.keys(out).length ? out : undefined;
}

function buildUserDataPayload(
  userData?: MetaCapiUserData
): Record<string, unknown> | undefined {
  if (!userData) return undefined;
  const out: Record<string, unknown> = {};

  const em = hashMetaPii(userData.email);
  if (em) out.em = [em];

  const externalId = hashMetaPii(userData.externalId);
  if (externalId) out.external_id = [externalId];

  const fbp = userData.fbp?.trim();
  if (fbp) out.fbp = fbp;

  const fbc = resolveFbc(userData);
  if (fbc) out.fbc = fbc;

  const ip = userData.clientIpAddress?.trim();
  if (ip) out.client_ip_address = ip;

  const ua = userData.clientUserAgent?.trim();
  if (ua) out.client_user_agent = ua;

  return Object.keys(out).length ? out : undefined;
}

/**
 * Send events to Meta Conversions API (Graph). No-ops when token/pixel missing.
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */
export async function sendMetaCapiEvents(
  input: SendMetaCapiEventsInput
): Promise<boolean> {
  const cfg = getMetaCapiConfig();
  if (!cfg) return false;
  if (!input.events.length) return false;

  const data = input.events
    .map((event) => {
      const eventId = event.eventId?.trim();
      const eventName = event.eventName?.trim();
      if (!eventId || !eventName) return null;

      const payload: Record<string, unknown> = {
        event_name: eventName,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: event.actionSource ?? "website",
      };

      const url = event.eventSourceUrl?.trim();
      if (url) payload.event_source_url = url;

      const userData = buildUserDataPayload(event.userData);
      if (userData) payload.user_data = userData;

      const customData = sanitizeCustomData(event.customData);
      if (customData) payload.custom_data = customData;

      return payload;
    })
    .filter((row): row is Record<string, unknown> => Boolean(row));

  if (data.length === 0) return false;

  const body: Record<string, unknown> = {
    data,
    access_token: cfg.accessToken,
  };
  if (cfg.testEventCode) {
    body.test_event_code = cfg.testEventCode;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${cfg.graphVersion}/${cfg.pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/** Client IP from common proxy headers (Vercel / Cloudflare). */
export function clientIpFromRequestHeaders(
  headers: Headers | { get(name: string): string | null }
): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return null;
}
