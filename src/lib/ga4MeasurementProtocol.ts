import { GA4_MEASUREMENT_ID } from "@/lib/ga4-constants";

type Ga4Primitive = string | number | boolean;

/** GA4 ecommerce line item (Measurement Protocol). */
export type Ga4ItemParam = Record<string, Ga4Primitive>;

type Ga4Event = {
  name: string;
  params?: Record<string, unknown>;
};

type SendGa4EventsInput = {
  clientId: string;
  userId?: string | null;
  /** GA4 session id (digits); merged into each event for session-scoped attribution. */
  gaSessionId?: string | null;
  events: Ga4Event[];
};

function getGa4Config(): { measurementId: string; apiSecret: string } | null {
  // Canonical server-side GA4 configuration. Measurement ID is hardcoded (public);
  // the API secret must stay in env since it is a credential.
  const measurementId = GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA_API_SECRET?.trim();
  if (!measurementId || !apiSecret) return null;
  return { measurementId, apiSecret };
}

function sanitizeValue(value: unknown): Ga4Primitive | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 100) : undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "boolean") return value;
  return undefined;
}

function sanitizeItemRow(row: unknown): Ga4ItemParam | undefined {
  if (!row || typeof row !== "object") return undefined;
  const out: Ga4ItemParam = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    const sanitized = sanitizeValue(v);
    if (sanitized !== undefined) out[k] = sanitized;
  }
  return Object.keys(out).length ? out : undefined;
}

function sanitizeItems(value: unknown): Ga4ItemParam[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .map((row) => sanitizeItemRow(row))
    .filter((row): row is Ga4ItemParam => Boolean(row));
  return rows.length ? rows : undefined;
}

function sanitizeParams(
  params?: Record<string, unknown>
): Record<string, Ga4Primitive | Ga4ItemParam[]> | undefined {
  if (!params) return undefined;
  const out: Record<string, Ga4Primitive | Ga4ItemParam[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === "items") {
      const items = sanitizeItems(value);
      if (items?.length) out.items = items;
      continue;
    }
    const sanitized = sanitizeValue(value);
    if (sanitized !== undefined) {
      out[key] = sanitized;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export async function sendGa4Events(
  input: SendGa4EventsInput
): Promise<boolean> {
  const cfg = getGa4Config();
  if (!cfg) return false;
  if (!input.clientId || input.events.length === 0) return false;

  const sessionId = input.gaSessionId?.trim();

  const events = input.events
    .map((event) => {
      const rawParams: Record<string, unknown> = {
        ...((event.params as Record<string, unknown>) || {}),
      };
      if (sessionId) {
        rawParams.session_id = sessionId;
        if (rawParams.engagement_time_msec === undefined) {
          rawParams.engagement_time_msec = 1;
        }
      }
      return {
        name: event.name,
        params: sanitizeParams(rawParams),
      };
    })
    .filter((event) => event.name.trim().length > 0);

  if (events.length === 0) return false;

  const payload: Record<string, unknown> = {
    client_id: input.clientId,
    events,
    non_personalized_ads: true,
  };
  if (input.userId?.trim()) {
    payload.user_id = input.userId.trim();
  }

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${cfg.measurementId}&api_secret=${cfg.apiSecret}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
