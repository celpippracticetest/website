import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isHomeAbVariant, isHomeAbEventType } from "@/lib/homeAbTest";

export const runtime = "nodejs";

/**
 * Public endpoint: records homepage A/B impressions (session-deduped on client).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const eventType = body?.eventType;
    const variantRaw = body?.variant;

    if (!isHomeAbEventType(eventType) || eventType !== "page_view") {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }
    if (typeof variantRaw !== "string" || !isHomeAbVariant(variantRaw)) {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("home_ab_events").insertOne({
      eventType: "page_view",
      variant: variantRaw,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("home-ab-event:", e);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
