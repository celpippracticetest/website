import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import clientPromise from "@/lib/appDocumentsClient";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const eventName =
      typeof body?.eventName === "string" ? body.eventName.trim() : "";

    if (!eventName) {
      return NextResponse.json(
        { error: "eventName is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("cancellation_flow_events").insertOne({
      userId,
      flowId: typeof body?.flowId === "string" ? body.flowId : null,
      eventName,
      step: typeof body?.step === "string" ? body.step : null,
      reason: typeof body?.reason === "string" ? body.reason : null,
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? body.metadata
          : null,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving cancellation flow event:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save cancellation flow event" },
      { status: 500 }
    );
  }
}
