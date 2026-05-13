import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";
import {
  isPricingAbLayout,
  type PricingAbEventType,
  PRICING_AB_EVENT_TYPES,
} from "@/lib/pricingAbTest";

export const runtime = "nodejs";

function isValidEventType(value: unknown): value is PricingAbEventType {
  return typeof value === "string" && (PRICING_AB_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Public endpoint: records pricing page impressions for A/B reporting (session-deduped on client).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const eventType = body?.eventType;
    const layoutRaw = body?.layout;

    if (!isValidEventType(eventType) || eventType !== "page_view") {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }
    if (typeof layoutRaw !== "string" || !isPricingAbLayout(layoutRaw)) {
      return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("pricing_ab_events").insertOne({
      eventType: "page_view",
      layout: layoutRaw,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("pricing-ab-event:", e);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
