import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { sendEmailWithSender } from "@/lib/email/sender-client";
import {
  buildReminderEmailConfigWithDefaults,
  REMINDER_EMAIL_CONFIG_COLLECTION,
  REMINDER_EMAIL_CONFIG_KEY,
  type ReminderEmailConfigInput,
  type ReminderStageKey,
} from "@/lib/reminder-email/config";
import { renderReminderEmailHtml } from "@/lib/reminder-email/render";

type ReminderFlow = "no_activity_signup" | "inactive_activity";
type ABVariant = "A" | "B";

type NoActivityStage = {
  key: ReminderStageKey;
  minHoursSinceSignup: number;
};

type InactiveStage = {
  key: ReminderStageKey;
  minHoursSinceActivity: number;
};

type SignupCandidate = {
  userId: string;
  signupAt?: Date;
  activityCount: number;
  lastActivityAt?: Date;
  isSubscribed?: boolean;
  reminderFlow?: ReminderFlow;
  reminderStage?: string;
  lastReminderSentAt?: Date;
  lastEngagedAt?: Date;
  reminderWindowStartedAt?: Date;
  remindersInWindow?: number;
};

type InactiveCandidate = {
  userId: string;
  lastActivityAt?: Date;
  isSubscribed?: boolean;
  reminderFlow?: ReminderFlow;
  reminderStage?: string;
  lastReminderSentAt?: Date;
  reminderWindowStartedAt?: Date;
  remindersInWindow?: number;
};

type ResolvedReminder = {
  userId: string;
  flow: ReminderFlow;
  stage: string;
  stageIndex: number;
  variant: ABVariant;
  subject: string;
  html: string;
  stageKey: ReminderStageKey;
  reminderWindowStartedAt?: Date;
  remindersInWindow: number;
};

const REMINDER_STATE_COLLECTION = "useractivityreminders";
const REMINDER_METRICS_COLLECTION = "useractivityreminderstats";
const REMINDER_LOCK_COLLECTION = "useractivityreminderdispatchlocks";
const SUBSCRIBER_REMINDER_COOLDOWN_HOURS = 168;
const DEFAULT_REMINDER_COOLDOWN_HOURS = 24;
const SIGNUP_LOOKBACK_DAYS = 7;

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

const NO_ACTIVITY_STAGES: NoActivityStage[] = [
  {
    key: "signup_welcome_20m_no_activity",
    minHoursSinceSignup: 0.33,
  },
  {
    key: "signup_day1_no_activity",
    minHoursSinceSignup: 24,
  },
  {
    key: "signup_day3_no_activity",
    minHoursSinceSignup: 72,
  },
  {
    key: "signup_day7_final_nudge_no_activity",
    minHoursSinceSignup: 168,
  },
];

const INACTIVE_STAGES: InactiveStage[] = [
  {
    key: "inactive_day1",
    minHoursSinceActivity: 24,
  },
  {
    key: "inactive_day7",
    minHoursSinceActivity: 168,
  },
];

async function getReminderEmailConfig(): Promise<ReminderEmailConfigInput> {
  const db = await getDb();
  const configCollection = db.collection(REMINDER_EMAIL_CONFIG_COLLECTION);
  const doc = await configCollection.findOne({ configKey: REMINDER_EMAIL_CONFIG_KEY });
  return buildReminderEmailConfigWithDefaults(doc?.config || null);
}

async function getNoStudySignupCandidates(limit: number): Promise<SignupCandidate[]> {
  const db = await getDb();
  const usersCollection = db.collection("users");
  const minSignupAt = new Date(Date.now() - SIGNUP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const rows = await usersCollection
    .aggregate<SignupCandidate>([
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
          isSubscribed: { $in: ["$plan", ["premium", "pro", "enterprise"]] },
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
          reminderStage: { $arrayElemAt: ["$reminderState.reminderStage", 0] },
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
          reminderStage: 1,
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

async function getInactiveCandidates(limit: number): Promise<InactiveCandidate[]> {
  const db = await getDb();
  const userActivityCollection = db.collection("useractivities");
  const minSignupAt = new Date(Date.now() - SIGNUP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const rows = await userActivityCollection
    .aggregate<InactiveCandidate>([
      {
        $group: {
          _id: "$userId",
          lastActivityAt: { $max: "$timestampUtc" },
        },
      },
      {
        $lookup: {
          from: REMINDER_STATE_COLLECTION,
          localField: "_id",
          foreignField: "userId",
          as: "reminderState",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "clerkUserId",
          as: "userProfile",
        },
      },
      {
        $addFields: {
          createdAt: { $arrayElemAt: ["$userProfile.createdAt", 0] },
          isSubscribed: {
            $in: [{ $arrayElemAt: ["$userProfile.plan", 0] }, ["premium", "pro", "enterprise"]],
          },
        },
      },
      {
        $match: {
          createdAt: { $gte: minSignupAt },
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          lastActivityAt: 1,
          isSubscribed: 1,
          lastReminderSentAt: { $arrayElemAt: ["$reminderState.lastReminderSentAt", 0] },
          reminderFlow: { $arrayElemAt: ["$reminderState.reminderFlow", 0] },
          reminderStage: { $arrayElemAt: ["$reminderState.reminderStage", 0] },
          reminderWindowStartedAt: { $arrayElemAt: ["$reminderState.reminderWindowStartedAt", 0] },
          remindersInWindow: { $arrayElemAt: ["$reminderState.remindersInWindow", 0] },
        },
      },
      { $sort: { lastActivityAt: -1 } },
      { $limit: limit },
    ])
    .toArray();

  return rows;
}

function getNoActivityNextStage(
  candidate: SignupCandidate,
  now: Date
): { stage: NoActivityStage; stageIndex: number } | null {
  const signupAt = toDate(candidate.signupAt);
  if (!signupAt) return null;

  // Exit as soon as any user activity exists.
  if ((candidate.activityCount ?? 0) > 0 || toDate(candidate.lastActivityAt)) return null;

  const reminderFlow = candidate.reminderFlow;
  const reminderStage = candidate.reminderStage;
  const lastReminderSentAt = toDate(candidate.lastReminderSentAt);
  const lastEngagedAt = toDate(candidate.lastEngagedAt);
  const reminderWindowStartedAt = toDate(candidate.reminderWindowStartedAt);
  const remindersInWindow = candidate.remindersInWindow ?? 0;
  const isSubscribed = Boolean(candidate.isSubscribed);
  const reminderCooldownHours = isSubscribed
    ? SUBSCRIBER_REMINDER_COOLDOWN_HOURS
    : DEFAULT_REMINDER_COOLDOWN_HOURS;
  if (lastEngagedAt) return null;
  const isWindowActive = reminderWindowStartedAt && !hasElapsedHours(reminderWindowStartedAt, now, 168);
  if (isWindowActive && remindersInWindow >= 4) return null;

  if (isSubscribed) {
    if (!lastReminderSentAt) {
      const welcomeStage = NO_ACTIVITY_STAGES[0];
      if (!welcomeStage || !hasElapsedHours(signupAt, now, welcomeStage.minHoursSinceSignup)) return null;
      return { stage: welcomeStage, stageIndex: 0 };
    }

    const weeklyStageIndex = NO_ACTIVITY_STAGES.length - 1;
    const weeklyStage = NO_ACTIVITY_STAGES[weeklyStageIndex];
    if (!weeklyStage) return null;
    const dueBySignupGap = hasElapsedHours(signupAt, now, weeklyStage.minHoursSinceSignup);
    const reminderCooldownPassed = hasElapsedHours(lastReminderSentAt, now, reminderCooldownHours);
    if (!dueBySignupGap || !reminderCooldownPassed) return null;
    return { stage: weeklyStage, stageIndex: weeklyStageIndex };
  }

  const currentStageIndex =
    reminderFlow === "no_activity_signup" && reminderStage
      ? NO_ACTIVITY_STAGES.findIndex((item) => item.key === reminderStage)
      : -1;
  const nextStageIndex = currentStageIndex + 1;
  if (nextStageIndex < 0 || nextStageIndex >= NO_ACTIVITY_STAGES.length) return null;

  const stage = NO_ACTIVITY_STAGES[nextStageIndex];
  const dueBySignupGap = hasElapsedHours(signupAt, now, stage.minHoursSinceSignup);
  const reminderCooldownPassed =
    !lastReminderSentAt || hasElapsedHours(lastReminderSentAt, now, reminderCooldownHours);
  if (!dueBySignupGap || !reminderCooldownPassed) return null;

  return { stage, stageIndex: nextStageIndex };
}

function getInactiveNextStage(
  candidate: InactiveCandidate,
  now: Date
): { stage: InactiveStage; stageIndex: number } | null {
  const lastActivityAt = toDate(candidate.lastActivityAt);
  if (!lastActivityAt) return null;

  const reminderFlow = candidate.reminderFlow;
  const reminderStage = candidate.reminderStage;
  const lastReminderSentAt = toDate(candidate.lastReminderSentAt);
  const reminderWindowStartedAt = toDate(candidate.reminderWindowStartedAt);
  const remindersInWindow = candidate.remindersInWindow ?? 0;
  const isSubscribed = Boolean(candidate.isSubscribed);
  const reminderCooldownHours = isSubscribed
    ? SUBSCRIBER_REMINDER_COOLDOWN_HOURS
    : DEFAULT_REMINDER_COOLDOWN_HOURS;
  const isWindowActive = reminderWindowStartedAt && !hasElapsedHours(reminderWindowStartedAt, now, 168);
  if (isWindowActive && remindersInWindow >= 4) return null;

  if (isSubscribed) {
    const weeklyStageIndex = INACTIVE_STAGES.length - 1;
    const weeklyStage = INACTIVE_STAGES[weeklyStageIndex];
    if (!weeklyStage) return null;
    const dueByInactivity = hasElapsedHours(lastActivityAt, now, weeklyStage.minHoursSinceActivity);
    const reminderCooldownPassed =
      !lastReminderSentAt || hasElapsedHours(lastReminderSentAt, now, reminderCooldownHours);
    if (!dueByInactivity || !reminderCooldownPassed) return null;
    return { stage: weeklyStage, stageIndex: weeklyStageIndex };
  }

  const currentStageIndex =
    reminderFlow === "inactive_activity" && reminderStage
      ? INACTIVE_STAGES.findIndex((item) => item.key === reminderStage)
      : -1;
  const nextStageIndex = currentStageIndex + 1;
  if (nextStageIndex < 0 || nextStageIndex >= INACTIVE_STAGES.length) return null;

  const stage = INACTIVE_STAGES[nextStageIndex];
  const dueByStudyGap = hasElapsedHours(lastActivityAt, now, stage.minHoursSinceActivity);
  const reminderCooldownPassed =
    !lastReminderSentAt || hasElapsedHours(lastReminderSentAt, now, reminderCooldownHours);
  if (!dueByStudyGap || !reminderCooldownPassed) return null;

  return { stage, stageIndex: nextStageIndex };
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const [signupCandidates, inactiveCandidates] = await Promise.all([
      getNoStudySignupCandidates(500),
      getInactiveCandidates(500),
    ]);
    const reminderEmailConfig = await getReminderEmailConfig();

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
    const segmentCounters: Record<string, number> = {
      no_activity_signup: 0,
      inactive_activity: 0,
    };

    const reminders: ResolvedReminder[] = [];

    for (const candidate of signupCandidates) {
      const next = getNoActivityNextStage(candidate, now);
      if (!next) continue;

      const variant = getVariant(candidate.userId);
      const stage = next.stage;
      const stageContent = reminderEmailConfig.stages[stage.key];
      reminders.push({
        userId: candidate.userId,
        flow: "no_activity_signup",
        stage: stage.key,
        stageIndex: next.stageIndex,
        variant,
        subject: variant === "A" ? stageContent.subjectA : stageContent.subjectB,
        html: "",
        stageKey: stage.key,
        reminderWindowStartedAt: candidate.reminderWindowStartedAt,
        remindersInWindow: candidate.remindersInWindow ?? 0,
      });
    }

    for (const candidate of inactiveCandidates) {
      const next = getInactiveNextStage(candidate, now);
      if (!next) continue;

      const variant = getVariant(candidate.userId);
      const stage = next.stage;
      const stageContent = reminderEmailConfig.stages[stage.key];
      reminders.push({
        userId: candidate.userId,
        flow: "inactive_activity",
        stage: stage.key,
        stageIndex: next.stageIndex,
        variant,
        subject: variant === "A" ? stageContent.subjectA : stageContent.subjectB,
        html: "",
        stageKey: stage.key,
        reminderWindowStartedAt: candidate.reminderWindowStartedAt,
        remindersInWindow: candidate.remindersInWindow ?? 0,
      });
    }

    for (const reminder of reminders) {
      attempted += 1;
      try {
        const claimKey = `${reminder.flow}:${reminder.stage}:${now.toISOString().slice(0, 13)}`;
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

        const firstName = user.firstName || user.username || "there";
        const stageContent = reminderEmailConfig.stages[reminder.stageKey];
        if (!stageContent) {
          skipped += 1;
          continue;
        }

        reminder.html = renderReminderEmailHtml({
          firstName,
          style: reminderEmailConfig.style,
          stage: stageContent,
        });

        await sendEmailWithSender({
          to: primaryEmail,
          subject: reminder.subject,
          html: reminder.html,
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
              reminderStage: reminder.stage,
              reminderStageIndex: reminder.stageIndex,
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
          stage: reminder.stage,
          variant: reminder.variant,
          subject: reminder.subject,
          sentAt: now,
          createdAt: now,
        });

        stageCounters[reminder.stage] = (stageCounters[reminder.stage] || 0) + 1;
        segmentCounters[reminder.flow] = (segmentCounters[reminder.flow] || 0) + 1;
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error("Word study reminder failed for user:", reminder.userId, error);
      }
    }

    return NextResponse.json({
      success: true,
      totalSignupCandidates: signupCandidates.length,
      totalInactiveCandidates: inactiveCandidates.length,
      remindersQueued: reminders.length,
      attempted,
      sent,
      skipped,
      failed,
      segmentCounters,
      stageCounters,
    });
  } catch (error) {
    console.error("Activity reminder cron failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
