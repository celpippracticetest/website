import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/analytics/heartbeat
 * Updates user's last active timestamp and sends event to GA4
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    // Get client info from request
    const body = await request.json().catch(() => ({}));
    const userAgent = request.headers.get("user-agent") || "unknown";
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const client = await clientPromise;
    const db = client.db("test");
    const collection = db.collection("user_activity");

    const sessionId = body.sessionId || `session-${Date.now()}`;
    const now = new Date();

    // Update or create user activity record
    await collection.updateOne(
      {
        $or: [{ userId: userId || null }, { sessionId }],
      },
      {
        $set: {
          userId: userId || null,
          sessionId,
          lastActiveAt: now,
          status: "online",
          userAgent,
          ip: ip.split(",")[0].trim(), // Get first IP if multiple
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Send event to Google Analytics 4 via Measurement Protocol
    if (process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET) {
      const measurementId = process.env.GA_MEASUREMENT_ID;
      const apiSecret = process.env.GA_API_SECRET;

      const ga4Payload = {
        client_id: userId || sessionId,
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
      };

      // Send to GA4 (fire and forget)
      fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ga4Payload),
        }
      ).catch((err) => console.error("GA4 tracking error:", err));
    }

    return NextResponse.json({
      success: true,
      message: "Heartbeat recorded",
    });
  } catch (error) {
    console.error("Error recording heartbeat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record heartbeat" },
      { status: 500 }
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
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("test");
    const collection = db.collection("user_activity");

    await collection.updateMany(
      {
        $or: [{ userId: userId || null }, { sessionId }],
      },
      {
        $set: {
          status: "offline",
          lastOfflineAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "User marked offline",
    });
  } catch (error) {
    console.error("Error marking user offline:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark user offline" },
      { status: 500 }
    );
  }
}
