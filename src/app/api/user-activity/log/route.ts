import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";

function extractEmailFromClerkUser(user: any): string | null {
  const byId = user?.emailAddresses?.find?.(
    (e: any) => e.id === user?.primaryEmailAddressId
  )?.emailAddress;

  const direct = user?.primaryEmailAddress?.emailAddress;

  const first = user?.emailAddresses?.[0]?.emailAddress;

  return byId || direct || first || null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = extractEmailFromClerkUser(user);

    const body = await request.json();
    const {
      eventType,
      context,
      skill,
      attemptId,
      contentId,
      status,
      durationSeconds,
      scoreOverall,
      scoreBreakdownJson,
      llmTokensPrompt = 0,
      llmTokensCompletion = 0,
      ipAddress,
      userAgent,
      notes,
      metadata = {},
    } = body;

    if (!eventType || !context) {
      return NextResponse.json(
        { error: "eventType and context are required" },
        { status: 400 }
      );
    }

    const clientIp =
      ipAddress ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const clientUserAgent =
      userAgent || request.headers.get("user-agent") || "unknown";

    const db = await getDb();
    const userActivityCollection = db.collection("useractivities");

    const activityLog = {
      userId: user.id,
      email, // ← ایمیل از Clerk
      eventType,
      context,
      skill: skill || null,
      attemptId: attemptId || null,
      contentId: contentId || null,
      status: status || null,
      durationSeconds: durationSeconds || null,
      scoreOverall: scoreOverall || null,
      scoreBreakdownJson: scoreBreakdownJson || null,
      llmTokensPrompt: llmTokensPrompt || 0,
      llmTokensCompletion: llmTokensCompletion || 0,
      ipAddress: clientIp,
      userAgent: clientUserAgent,
      deviceUaHash: Buffer.from(clientUserAgent)
        .toString("base64")
        .slice(0, 16),
      notes: notes || null,
      metadata,
      timestampUtc: new Date(),
    };

    await userActivityCollection.insertOne(activityLog);

    return NextResponse.json({
      success: true,
      message: "Activity logged successfully",
    });
  } catch (error) {
    console.error("Error logging user activity:", error);
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 }
    );
  }
}

// Bulk log endpoint for multiple activities
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = extractEmailFromClerkUser(user);

    const body = await request.json();
    const { activities } = body;

    if (!Array.isArray(activities) || activities.length === 0) {
      return NextResponse.json(
        { error: "activities array is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userActivityCollection = db.collection("useractivities");

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const clientUserAgent = request.headers.get("user-agent") || "unknown";

    const activityLogs = activities.map((activity: any) => ({
      userId: user.id,
      email,
      eventType: activity.eventType,
      context: activity.context,
      skill: activity.skill || null,
      attemptId: activity.attemptId || null,
      contentId: activity.contentId || null,
      status: activity.status || null,
      durationSeconds: activity.durationSeconds || null,
      scoreOverall: activity.scoreOverall || null,
      scoreBreakdownJson: activity.scoreBreakdownJson || null,
      llmTokensPrompt: activity.llmTokensPrompt || 0,
      llmTokensCompletion: activity.llmTokensCompletion || 0,
      ipAddress: clientIp,
      userAgent: clientUserAgent,
      deviceUaHash: Buffer.from(clientUserAgent)
        .toString("base64")
        .slice(0, 16),
      notes: activity.notes || null,
      metadata: activity.metadata || {},
      timestampUtc: new Date(),
    }));

    await userActivityCollection.insertMany(activityLogs);

    return NextResponse.json({
      success: true,
      message: `${activities.length} activities logged successfully`,
    });
  } catch (error) {
    console.error("Error bulk logging user activities:", error);
    return NextResponse.json(
      { error: "Failed to log activities" },
      { status: 500 }
    );
  }
}
