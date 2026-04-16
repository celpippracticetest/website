type Ga4Primitive = string | number | boolean;

type Ga4Event = {
  name: string;
  params?: Record<string, unknown>;
};

type SendGa4EventsInput = {
  clientId: string;
  userId?: string | null;
  events: Ga4Event[];
};

function getGa4Config(): { measurementId: string; apiSecret: string } | null {
  // Canonical server-side GA4 configuration.
  const measurementId = process.env.GA_MEASUREMENT_ID?.trim();
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

function sanitizeParams(
  params?: Record<string, unknown>
): Record<string, Ga4Primitive> | undefined {
  if (!params) return undefined;
  const out: Record<string, Ga4Primitive> = {};
  for (const [key, value] of Object.entries(params)) {
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

  const events = input.events
    .map((event) => ({
      name: event.name,
      params: sanitizeParams(event.params),
    }))
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
