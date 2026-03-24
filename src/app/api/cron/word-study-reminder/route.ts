import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { sendTransactionalEmail } from "@/lib/email/sender-client";
import {
  buildReminderEmailConfigWithDefaults,
  REMINDER_EMAIL_CONFIG_COLLECTION,
  REMINDER_EMAIL_CONFIG_KEY,
  type ReminderEmailConfigInput,
  type ReminderEmailStage,
} from "@/lib/reminder-email/config";

type ReminderFlow = "signup_no_activity" | "inactive";
type ABVariant = "A" | "B";

type Candidate = {
  userId: string;
  signupAt?: Date;
  lastActivityAt?: Date;
  activityCount: number;
  isSubscribed?: boolean;
  reminderFlow?: ReminderFlow;
  reminderStageId?: string;
  lastReminderSentAt?: Date;
  lastEngagedAt?: Date;
  reminderWindowStartedAt?: Date;
  remindersInWindow?: number;
};

type ResolvedReminder = {
  userId: string;
  flow: ReminderFlow;
  stageId: string;
  stageLabel: string;
  senderCode: string;
  variant: ABVariant;
  reminderWindowStartedAt?: Date;
  remindersInWindow: number;
};

const REMINDER_STATE_COLLECTION = "useractivityreminders";
const REMINDER_METRICS_COLLECTION = "useractivityreminderstats";
const REMINDER_LOCK_COLLECTION = "useractivityreminderdispatchlocks";
const SUBSCRIBER_REMINDER_COOLDOWN_HOURS = 168;
const DEFAULT_REMINDER_COOLDOWN_HOURS = 24;
const SIGNUP_LOOKBACK_DAYS = 30;

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

function hasElapsedHours(reference?: Date, now: Date = new Date(), hours: number = 24) {
  if (!reference) return false;
  return now.getTime() - reference.getTime() >= hours * 60 * 60 * 1000;
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value as string | number);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function getVariant(userId: string): ABVariant {
  const hash = Array.from(userId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? "A" : "B";
}

function convertToHours(amount: number, unit: string): number {
  switch (unit) {
    case "minutes":
      return amount / 60;
    case "hours":
      return amount;
    case "days":
      return amount * 24;
    default:
      return amount * 24;
  }
}

async function getReminderEmailConfig(): Promise<ReminderEmailConfigInput> {
  const db = await getDb();
  const configCollection = db.collection(REMINDER_EMAIL_CONFIG_COLLECTION);
  const doc = await configCollection.findOne({ configKey: REMINDER_EMAIL_CONFIG_KEY });
  return buildReminderEmailConfigWithDefaults(doc?.config || null);
}

async function getCandidates(limit: number): Promise<Candidate[]> {
  const db = await getDb();
  const usersCollection = db.collection("users");
  const minSignupAt = new Date(Date.now() - SIGNUP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const rows = await usersCollection
    .aggregate<Candidate>([
      {
        $project: {
          _id: 0,
          userId: "$clerkUserId",
          signupAt: "$createdAt",
          plan: "$plan",
        },
      },
      {
        $match: {
          userId: { $type: "string", $ne: "" },
          signupAt: { $gte: minSignupAt },
        },
      },
      {
        $lookup: {
          from: "useractivities",
          let: { uid: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
            {
              $group: {
                _id: null,
                activityCount: { $sum: 1 },
                lastActivityAt: { $max: "$timestampUtc" },
              },
            },
          ],
          as: "activitySummary",
        },
      },
      {
        $addFields: {
          activityCount: {
            $ifNull: [{ $arrayElemAt: ["$activitySummary.activityCount", 0] }, 0],
          },
          lastActivityAt: { $arrayElemAt: ["$activitySummary.lastActivityAt", 0] },
          isSubscribed: {
            $in: ["$plan", ["premium", "pro", "plus", "enterprise"]],
          },
        },
      },
      {
        $lookup: {
          from: REMINDER_STATE_COLLECTION,
          localField: "userId",
          foreignField: "userId",
          as: "reminderState",
        },
      },
      {
        $addFields: {
          lastReminderSentAt: { $arrayElemAt: ["$reminderState.lastReminderSentAt", 0] },
          reminderFlow: { $arrayElemAt: ["$reminderState.reminderFlow", 0] },
          reminderStageId: { $arrayElemAt: ["$reminderState.reminderStageId", 0] },
          lastEngagedAt: { $arrayElemAt: ["$reminderState.lastEngagedAt", 0] },
          reminderWindowStartedAt: { $arrayElemAt: ["$reminderState.reminderWindowStartedAt", 0] },
          remindersInWindow: { $arrayElemAt: ["$reminderState.remindersInWindow", 0] },
        },
      },
      {
        $project: {
          userId: 1,
          signupAt: 1,
          activityCount: 1,
          lastActivityAt: 1,
          isSubscribed: 1,
          lastReminderSentAt: 1,
          reminderFlow: 1,
          reminderStageId: 1,
          lastEngagedAt: 1,
          reminderWindowStartedAt: 1,
          remindersInWindow: 1,
        },
      },
      { $sort: { signupAt: -1 } },
      { $limit: limit },
    ])
    .toArray();

  return rows;
}

function findNextStageForCandidate(
  candidate: Candidate,
  stages: ReminderEmailStage[],
  now: Date
): ReminderEmailStage | null {
  const signupAt = toDate(candidate.signupAt);
  const lastActivityAt = toDate(candidate.lastActivityAt);
  const lastReminderSentAt = toDate(candidate.lastReminderSentAt);
  const lastEngagedAt = toDate(candidate.lastEngagedAt);
  const reminderWindowStartedAt = toDate(candidate.reminderWindowStartedAt);
  const remindersInWindow = candidate.remindersInWindow ?? 0;
  const isSubscribed = Boolean(candidate.isSubscribed);

  // If user engaged, stop all reminders
  if (lastEngagedAt) return null;

  // Check window limits
  const reminderCooldownHours = isSubscribed
    ? SUBSCRIBER_REMINDER_COOLDOWN_HOURS
    : DEFAULT_REMINDER_COOLDOWN_HOURS;
  const isWindowActive =
    reminderWindowStartedAt && !hasElapsedHours(reminderWindowStartedAt, now, 168);
  if (isWindowActive && remindersInWindow >= 4) return null;

  // For signup_no_activity triggers (no user activity yet)
  if (!lastActivityAt || (candidate.activityCount ?? 0) === 0) {
    if (!signupAt) return null;

    const signupStages = stages
      .filter((s) => s.enabled && s.triggerType === "signup_no_activity")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (signupStages.length === 0) return null;

    // Find the next eligible stage
    const currentStageIndex = candidate.reminderStageId
      ? signupStages.findIndex((s) => s.id === candidate.reminderStageId)
      : -1;

    for (let i = currentStageIndex + 1; i < signupStages.length; i++) {
      const stage = signupStages[i];
      const requiredHours = convertToHours(stage.delayAmount, stage.delayUnit);
      const isTimeReached = hasElapsedHours(signupAt, now, requiredHours);
      const cooldownPassed =
        !lastReminderSentAt || hasElapsedHours(lastReminderSentAt, now, reminderCooldownHours);

      if (isTimeReached && cooldownPassed) {
        return stage;
      }
    }
    return null;
  }

  // For inactive triggers (user was active but is now inactive)
  if (lastActivityAt) {
    const inactiveStages = stages
      .filter((s) => s.enabled && s.triggerType === "inactive")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (inactiveStages.length === 0) return null;

    const currentStageIndex = candidate.reminderStageId
      ? inactiveStages.findIndex((s) => s.id === candidate.reminderStageId)
      : -1;

    for (let i = currentStageIndex + 1; i < inactiveStages.length; i++) {
      const stage = inactiveStages[i];
      const requiredHours = convertToHours(stage.delayAmount, stage.delayUnit);
      const isTimeReached = hasElapsedHours(lastActivityAt, now, requiredHours);
      const cooldownPassed =
        !lastReminderSentAt || hasElapsedHours(lastReminderSentAt, now, reminderCooldownHours);

      if (isTimeReached && cooldownPassed) {
        return stage;
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const candidates = await getCandidates(1000);
    const reminderEmailConfig = await getReminderEmailConfig();
    const stages = reminderEmailConfig.stages;

    const db = await getDb();
    const reminderStateCollection = db.collection(REMINDER_STATE_COLLECTION);
    const metricsCollection = db.collection(REMINDER_METRICS_COLLECTION);
    const lockCollection = db.collection<{
      _id: string;
      userId: string;
      claimKey: string;
      createdAt: Date;
    }>(REMINDER_LOCK_COLLECTION);
    const cc = await clerkClient();

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let attempted = 0;
    const stageCounters: Record<string, number> = {};
    const flowCounters: Record<string, number> = {
      signup_no_activity: 0,
      inactive: 0,
    };

    const reminders: ResolvedReminder[] = [];

    // Build reminders queue
    for (const candidate of candidates) {
      const nextStage = findNextStageForCandidate(candidate, stages, now);
      if (!nextStage) continue;

      const flow: ReminderFlow = nextStage.triggerType;
      const variant = getVariant(candidate.userId);

      reminders.push({
        userId: candidate.userId,
        flow,
        stageId: nextStage.id,
        stageLabel: nextStage.label,
        senderCode: nextStage.senderCode,
        variant,
        reminderWindowStartedAt: candidate.reminderWindowStartedAt,
        remindersInWindow: candidate.remindersInWindow ?? 0,
      });
    }

    // Send reminders
    for (const reminder of reminders) {
      attempted += 1;

      try {
        const claimKey = `${reminder.flow}:${reminder.stageId}:${now.toISOString().slice(0, 13)}`;
        try {
          await lockCollection.insertOne({
            _id: `${reminder.userId}:${claimKey}`,
            userId: reminder.userId,
            claimKey,
            createdAt: now,
          });
        } catch {
          skipped += 1;
          continue;
        }

        const user = await cc.users.getUser(reminder.userId);
        const primaryEmail =
          user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
          user.emailAddresses[0]?.emailAddress;

        if (!primaryEmail) {
          skipped += 1;
          continue;
        }

        if (!reminder.senderCode || reminder.senderCode.trim().length === 0) {
          console.error(
            `[reminder-email] Missing senderCode for stage: ${reminder.stageId}, user: ${reminder.userId}`
          );
          skipped += 1;
          continue;
        }

        // Send via Sender.net transactional email template
        await sendTransactionalEmail({
          to: primaryEmail,
          senderCode: reminder.senderCode,
        });

        const reminderWindowStartedAt = toDate(reminder.reminderWindowStartedAt);
        const isWindowActive =
          reminderWindowStartedAt && !hasElapsedHours(reminderWindowStartedAt, now, 168);
        const nextWindowStartedAt = isWindowActive ? reminderWindowStartedAt : now;
        const nextRemindersInWindow = isWindowActive ? reminder.remindersInWindow + 1 : 1;

        await reminderStateCollection.updateOne(
          { userId: reminder.userId },
          {
            $set: {
              userId: reminder.userId,
              lastReminderSentAt: now,
              reminderFlow: reminder.flow,
              reminderStageId: reminder.stageId,
              reminderVariant: reminder.variant,
              reminderWindowStartedAt: nextWindowStartedAt,
              remindersInWindow: nextRemindersInWindow,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          { upsert: true }
        );

        await metricsCollection.insertOne({
          userId: reminder.userId,
          flow: reminder.flow,
          stageId: reminder.stageId,
          stageLabel: reminder.stageLabel,
          variant: reminder.variant,
          senderCode: reminder.senderCode,
          sentAt: now,
          createdAt: now,
        });

        stageCounters[reminder.stageLabel] = (stageCounters[reminder.stageLabel] || 0) + 1;
        flowCounters[reminder.flow] = (flowCounters[reminder.flow] || 0) + 1;
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error("Reminder email failed for user:", reminder.userId, error);
      }
    }

    return NextResponse.json({
      success: true,
      totalCandidates: candidates.length,
      remindersQueued: reminders.length,
      attempted,
      sent,
      skipped,
      failed,
      flowCounters,
      stageCounters,
    });
  } catch (error) {
    console.error("Reminder email cron failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
