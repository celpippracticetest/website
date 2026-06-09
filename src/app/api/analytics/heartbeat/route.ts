import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import { sendGa4Events } from "@/lib/ga4MeasurementProtocol";
import {
  markUserActivityOffline,
  upsertUserActivityHeartbeat,
} from "@/lib/pg/userActivityPresence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/analytics/heartbeat
 * Updates user's last active timestamp and sends event to GA4
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    const body = await request.json().catch(() => ({}));
    const userAgent = request.headers.get("user-agent") || "unknown";
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const sessionId = body.sessionId || `session-${Date.now()}`;
    const now = new Date();

    await upsertUserActivityHeartbeat({
      userId: userId || null,
      sessionId,
      userAgent,
      ip: ip.split(",")[0].trim(),
      now,
    });

    void sendGa4Events({
      clientId: userId || sessionId,
      userId: userId || undefined,
      events: [
        {
          name: "user_active",
          params: {
            session_id: sessionId,
            engagement_time_msec: 100,
            user_logged_in: !!userId,
          },
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Heartbeat recorded",
    });
  } catch (error) {
    console.error("Error recording heartbeat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record heartbeat" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/analytics/heartbeat
 * Marks user as offline
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json().catch(() => ({}));
    const sessionId = body.sessionId;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { success: false, error: "No user or session identified" },
        { status: 400 },
      );
    }

    await markUserActivityOffline({
      userId: userId || null,
      sessionId: typeof sessionId === "string" ? sessionId : null,
    });

    return NextResponse.json({
      success: true,
      message: "User marked offline",
    });
  } catch (error) {
    console.error("Error marking user offline:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark user offline" },
      { status: 500 },
    );
  }
}
