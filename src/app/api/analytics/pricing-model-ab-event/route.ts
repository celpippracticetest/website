import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";
import {
  isPricingModelAbEventType,
  isPricingModelAbVariant,
} from "@/lib/pricingModelAbTest";

export const runtime = "nodejs";

/**
 * Public endpoint: records pricing-modal plan-list A/B impressions (session-deduped on client).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const eventType = body?.eventType;
    const modelRaw = body?.variant ?? body?.model;

    if (!isPricingModelAbEventType(eventType) || eventType !== "page_view") {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }
    if (typeof modelRaw !== "string" || !isPricingModelAbVariant(modelRaw)) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("pricing_model_ab_events").insertOne({
      eventType: "page_view",
      model: modelRaw,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("pricing-model-ab-event:", e);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
