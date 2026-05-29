import { NextRequest, NextResponse } from "next/server";

import {
  filterValidUserRows,
  loadActivitySummariesByUserIds,
  listRecentAuthUsers,
} from "@/lib/email-cron/sql-audience";
import { getDb } from "@/lib/appDocumentsClient";
import {
  chunkUserIds,
  extractUnknownPushwooshUserIds,
  sendPushwooshPracticeReminderToUsers,
} from "@/lib/mobile/pushwoosh";

const REMINDER_STATE_COLLECTION = "mobile_practice_push_reminders";
const REMINDER_COOLDOWN_HOURS = 24;
const INACTIVITY_HOURS = 24;
const CANDIDATE_LOOKBACK_DAYS = 45;

type ReminderStateDoc = {
  userId?: string;
  lastReminderSentAt?: Date;
};

function isAuthorizedCron(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const secret = process.env.CRON_SECRET;

  return Boolean(
    (authHeader && secret && authHeader === `Bearer ${secret}`) ||
      (token && secret && token === secret)
  );
}

function hasElapsedHours(reference: Date | undefined, now: Date, hours: number) {
  if (!reference) {
    return false;
  }
  return now.getTime() - reference.getTime() >= hours * 60 * 60 * 1000;
}

function toDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value as string | number);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function shouldRemindUser(opts: {
  signupAt?: Date;
  lastActivityAt?: Date;
  activityCount: number;
  now: Date;
}) {
  const { signupAt, lastActivityAt, activityCount, now } = opts;

  if (lastActivityAt) {
    return hasElapsedHours(lastActivityAt, now, INACTIVITY_HOURS);
  }

  if (activityCount > 0) {
    return true;
  }

  return Boolean(signupAt && hasElapsedHours(signupAt, now, INACTIVITY_HOURS));
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const minSignupAt = new Date(
      now.getTime() - CANDIDATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    );

    const userRows = filterValidUserRows(
      await listRecentAuthUsers({
        minSignupAt,
        limit: 5000,
        freeOnly: false,
      })
    );

    if (userRows.length === 0) {
      return NextResponse.json({
        success: true,
        totalCandidates: 0,
        remindersQueued: 0,
        batchesSent: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        unknownUsers: 0,
      });
    }

    const userIds = userRows.map((row) => row.user_id);
    const db = await getDb();
    const [activityByUser, stateDocs] = await Promise.all([
      loadActivitySummariesByUserIds(userIds),
      db
        .collection<ReminderStateDoc>(REMINDER_STATE_COLLECTION)
        .find({ userId: { $in: userIds } })
        .toArray(),
    ]);

    const stateByUser = new Map(
      stateDocs
        .filter((doc) => typeof doc.userId === "string" && doc.userId.trim() !== "")
        .map((doc) => [doc.userId as string, doc])
    );

    const eligibleUserIds: string[] = [];
    let skipped = 0;

    for (const row of userRows) {
      const activity = activityByUser.get(row.user_id);
      const eligible = shouldRemindUser({
        signupAt: row.signup_at,
        lastActivityAt: activity?.lastActivityAt,
        activityCount: activity?.activityCount ?? 0,
        now,
      });

      if (!eligible) {
        skipped += 1;
        continue;
      }

      const state = stateByUser.get(row.user_id);
      const lastReminderSentAt = toDate(state?.lastReminderSentAt);
      if (lastReminderSentAt && !hasElapsedHours(lastReminderSentAt, now, REMINDER_COOLDOWN_HOURS)) {
        skipped += 1;
        continue;
      }

      eligibleUserIds.push(row.user_id);
    }

    let batchesSent = 0;
    let sent = 0;
    let failed = 0;
    let unknownUsers = 0;
    const deliveredUserIds: string[] = [];

    for (const batch of chunkUserIds(eligibleUserIds)) {
      try {
        const response = await sendPushwooshPracticeReminderToUsers(batch, {
          title: "Time for CELPIP practice",
          body: "It has been a day since your last practice. Open the app for a quick session.",
          route: "/",
        });
        batchesSent += 1;
        sent += batch.length;
        unknownUsers += extractUnknownPushwooshUserIds(response).length;
        deliveredUserIds.push(...batch);
      } catch (error) {
        failed += batch.length;
        console.error("[practice-push-reminder] Pushwoosh batch failed", {
          batchSize: batch.length,
          error,
        });
      }
    }

    if (deliveredUserIds.length > 0) {
      await Promise.all(
        deliveredUserIds.map((userId) =>
          db.collection(REMINDER_STATE_COLLECTION).updateOne(
            { userId },
            {
              $set: {
                userId,
                lastReminderSentAt: now,
                updatedAt: now,
              },
              $setOnInsert: {
                createdAt: now,
              },
            },
            { upsert: true }
          )
        )
      );
    }

    return NextResponse.json({
      success: true,
      totalCandidates: userRows.length,
      remindersQueued: eligibleUserIds.length,
      batchesSent,
      sent,
      skipped,
      failed,
      unknownUsers,
    });
  } catch (error) {
    console.error("[practice-push-reminder] cron failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
