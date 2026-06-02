import { NextRequest, NextResponse } from "next/server";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { getDb } from "@/lib/appDocumentsClient";
import { getResendClient, sendResendHtmlEmail } from "@/lib/email/resend-client";
import {
  buildReminderMergeFields,
  renderReminderEmail,
} from "@/lib/reminder-email/merge-fields";
import {
  buildReminderEmailConfigWithDefaults,
  REMINDER_EMAIL_CONFIG_COLLECTION,
  REMINDER_EMAIL_CONFIG_KEY,
  type ReminderEmailConfigInput,
  type ReminderEmailStage,
} from "@/lib/reminder-email/config";
import {
  listReminderCandidates,
  type ReminderCandidate,
  type ReminderFlow,
} from "@/lib/reminder-email/candidates";

type ABVariant = "A" | "B";

type ResolvedReminder = {
  userId: string;
  flow: ReminderFlow;
  stageId: string;
  stageLabel: string;
  subject: string;
  htmlBody: string;
  variant: ABVariant;
  reminderWindowStartedAt?: Date;
  remindersInWindow: number;
};

const REMINDER_STATE_COLLECTION = "useractivityreminders";
const REMINDER_METRICS_COLLECTION = "useractivityreminderstats";
const REMINDER_LOCK_COLLECTION = "useractivityreminderdispatchlocks";
const SUBSCRIBER_REMINDER_COOLDOWN_HOURS = 168;
const DEFAULT_REMINDER_COOLDOWN_HOURS = 24;

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

function findNextStageForCandidate(
  candidate: ReminderCandidate,
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
    const candidates = await listReminderCandidates(1000);
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
    const cc = await appUserAdmin();

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
        subject: nextStage.subject,
        htmlBody: nextStage.htmlBody,
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

        if (!reminder.subject?.trim() || !reminder.htmlBody?.trim()) {
          console.error(
            `[reminder-email] Missing subject/htmlBody for stage: ${reminder.stageId}, user: ${reminder.userId}`
          );
          skipped += 1;
          continue;
        }

        if (!getResendClient()) {
          console.error("[reminder-email] RESEND_API_KEY is not configured; skipping send.");
          skipped += 1;
          continue;
        }

        const u = user as { firstName?: unknown; username?: unknown };
        const firstName =
          (typeof u.firstName === "string" ? u.firstName.trim() : "") ||
          (typeof u.username === "string" ? u.username.trim() : "") ||
          primaryEmail.split("@")[0] ||
          "there";
        const mergeFields = buildReminderMergeFields({
          firstName,
          email: primaryEmail,
        });
        const rendered = renderReminderEmail(reminder.subject, reminder.htmlBody, mergeFields);

        await sendResendHtmlEmail({
          to: primaryEmail,
          subject: rendered.subject,
          html: rendered.html,
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
          emailProvider: "resend",
          subject: reminder.subject,
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
