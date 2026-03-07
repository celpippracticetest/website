import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";

const REMINDER_STATE_COLLECTION = "useractivityreminders";

function extractEmailFromClerkUser(user: any): string | null {
  const byId = user?.emailAddresses?.find?.(
    (e: any) => e.id === user?.primaryEmailAddressId
  )?.emailAddress;

  const direct = user?.primaryEmailAddress?.emailAddress;

  const first = user?.emailAddresses?.[0]?.emailAddress;

  return byId || direct || first || null;
}

function detectDeviceType(userAgent: string): "mobile" | "desktop" {
  return /mobile|android|iphone|ipad|ipod/i.test(userAgent)
    ? "mobile"
    : "desktop";
}

export async function POST(request: NextRequest) {
  try {
    console.log("User activity log API called");
    const authContext = await getAuthenticatedRequestContext(request);
    const user = authContext?.user;
    if (!user) {
      console.log("No user found in request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = extractEmailFromClerkUser(user);

    const body = await request.json();
    console.log("Request body:", body);
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
      console.log("Missing required fields:", { eventType, context });
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
      email, 
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

    console.log("Inserting activity log:", activityLog);
    await userActivityCollection.insertOne(activityLog);
    const usersCollection = db.collection("users");

    // Keep engagement snapshot updated for retention/churn prevention automation
    const isPracticeEvent =
      eventType === "practice_attempt_started" ||
      eventType === "practice_attempt_completed" ||
      eventType === "mock_attempt_started" ||
      eventType === "mock_attempt_completed";
    const isCompletedTestEvent =
      eventType === "practice_attempt_completed" ||
      eventType === "mock_attempt_completed";
    const deviceType = detectDeviceType(clientUserAgent);

    if (isPracticeEvent || isCompletedTestEvent) {
      const userDoc = await usersCollection.findOne({ clerkUserId: user.id });
      const existingHistory = Array.isArray(userDoc?.engagement?.scoreHistory)
        ? (userDoc?.engagement?.scoreHistory as number[])
        : [];
      const nextHistory =
        isCompletedTestEvent && typeof scoreOverall === "number"
          ? [...existingHistory, scoreOverall].slice(-5)
          : existingHistory;
      const avgScoreCurrent =
        nextHistory.length > 0
          ? Number(
              (
                nextHistory.reduce((sum, score) => sum + Number(score || 0), 0) /
                nextHistory.length
              ).toFixed(2)
            )
          : null;
      const avgScoreDelta7d =
        nextHistory.length >= 2
          ? Number((nextHistory[nextHistory.length - 1] - nextHistory[0]).toFixed(2))
          : 0;

      await usersCollection.updateOne(
        { clerkUserId: user.id },
        {
          $set: {
            "engagement.lastPracticeTestDate": new Date(),
            "engagement.deviceLastUsed": deviceType,
            "engagement.deviceUsage.mobile":
              deviceType === "mobile"
                ? ((userDoc?.engagement?.deviceUsage?.mobile as number) || 0) + 1
                : (userDoc?.engagement?.deviceUsage?.mobile as number) || 0,
            "engagement.deviceUsage.desktop":
              deviceType === "desktop"
                ? ((userDoc?.engagement?.deviceUsage?.desktop as number) || 0) + 1
                : (userDoc?.engagement?.deviceUsage?.desktop as number) || 0,
            "engagement.scoreHistory": nextHistory,
            "engagement.avgScoreCurrent": avgScoreCurrent,
            "engagement.avgScoreDelta7d": avgScoreDelta7d,
            "engagement.updatedAt": new Date(),
            updatedAt: new Date(),
          },
          ...(isCompletedTestEvent ? { $inc: { "engagement.totalTestsCompleted": 1 } } : {}),
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      await db.collection("user_learning_events").insertOne({
        userId: user.id,
        eventType,
        context,
        score: typeof scoreOverall === "number" ? scoreOverall : null,
        deviceType,
        occurredAt: new Date(),
        metadata: metadata || {},
      });
    }
    await db.collection(REMINDER_STATE_COLLECTION).updateOne(
      { userId: user.id },
      {
        $set: {
          userId: user.id,
          lastEngagedAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          reminderFlow: "",
          reminderStage: "",
          reminderStageIndex: "",
          reminderVariant: "",
          reminderWindowStartedAt: "",
          remindersInWindow: "",
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log("Activity logged successfully");

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
    const authContext = await getAuthenticatedRequestContext(request);
    const user = authContext?.user;
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
    const usersCollection = db.collection("users");
    const completedCount = activityLogs.filter(
      (log) =>
        log.eventType === "practice_attempt_completed" ||
        log.eventType === "mock_attempt_completed"
    ).length;
    const hasPracticeOrMock = activityLogs.some(
      (log) =>
        log.eventType === "practice_attempt_started" ||
        log.eventType === "practice_attempt_completed" ||
        log.eventType === "mock_attempt_started" ||
        log.eventType === "mock_attempt_completed"
    );
    if (hasPracticeOrMock) {
      await usersCollection.updateOne(
        { clerkUserId: user.id },
        {
          $set: {
            "engagement.lastPracticeTestDate": new Date(),
            "engagement.deviceLastUsed": detectDeviceType(clientUserAgent),
            "engagement.updatedAt": new Date(),
            updatedAt: new Date(),
          },
          ...(completedCount > 0
            ? { $inc: { "engagement.totalTestsCompleted": completedCount } }
            : {}),
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }
    const now = new Date();
    await db.collection(REMINDER_STATE_COLLECTION).updateOne(
      { userId: user.id },
      {
        $set: {
          userId: user.id,
          lastEngagedAt: now,
          updatedAt: now,
        },
        $unset: {
          reminderFlow: "",
          reminderStage: "",
          reminderStageIndex: "",
          reminderVariant: "",
          reminderWindowStartedAt: "",
          remindersInWindow: "",
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

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
