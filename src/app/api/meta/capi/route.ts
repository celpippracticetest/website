import { NextRequest, NextResponse } from "next/server";
import { META_EVENT } from "@/lib/meta-constants";
import {
  clientIpFromRequestHeaders,
  readMetaBrowserCookies,
  sendMetaCapiEvents,
} from "@/lib/metaConversionsApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set<string>([
  META_EVENT.PAGE_VIEW,
  META_EVENT.COMPLETE_REGISTRATION,
  META_EVENT.INITIATE_CHECKOUT,
]);

type MetaCapiBeaconBody = {
  eventName?: unknown;
  eventId?: unknown;
  eventSourceUrl?: unknown;
  email?: unknown;
  userId?: unknown;
  value?: unknown;
  currency?: unknown;
  contentIds?: unknown;
  fbclid?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value
    .map((row) => (typeof row === "string" ? row.trim() : ""))
    .filter(Boolean)
    .slice(0, 50);
  return ids.length ? ids : null;
}

/**
 * Browser beacon for Meta CAPI PageView / CompleteRegistration / InitiateCheckout.
 * Purchase is server-only (Stripe webhook).
 */
export async function POST(req: NextRequest) {
  let body: MetaCapiBeaconBody;
  try {
    body = (await req.json()) as MetaCapiBeaconBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = asTrimmedString(body.eventName);
  const eventId = asTrimmedString(body.eventId);
  if (!eventName || !eventId || !ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const cookieHeader = req.headers.get("cookie");
  const { fbp, fbc } = readMetaBrowserCookies(cookieHeader);

  const value = asFiniteNumber(body.value);
  const currency = asTrimmedString(body.currency);
  const contentIds = asStringArray(body.contentIds);

  const ok = await sendMetaCapiEvents({
    events: [
      {
        eventName,
        eventId,
        eventSourceUrl:
          asTrimmedString(body.eventSourceUrl) ||
          req.headers.get("referer") ||
          undefined,
        userData: {
          email: asTrimmedString(body.email),
          externalId: asTrimmedString(body.userId),
          fbp,
          fbc,
          fbclid: asTrimmedString(body.fbclid),
          clientIpAddress: clientIpFromRequestHeaders(req.headers),
          clientUserAgent: req.headers.get("user-agent"),
        },
        customData: {
          value,
          currency,
          contentIds,
          contentType: contentIds?.length ? "product" : undefined,
        },
      },
    ],
  });

  return NextResponse.json({ ok });
}
