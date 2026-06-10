import { NextRequest, NextResponse } from "next/server";
import { sendResendHtmlEmail } from "@/lib/email/resend-client";
import {
  buildLearningReminderMergeFields,
  renderLearningReminderEmail,
} from "@/lib/learning/reminder-email";
import {
  chunkUserIds,
  sendPushwooshPracticeReminderToUsers,
} from "@/lib/mobile/pushwoosh";
import { listLearningReminderCandidates } from "@/repositories/learningAssignments.repo";
import {
  getLearningReminderStatesByUserIds,
  recordLearningReminderSent,
} from "@/repositories/learningReminders.repo";

const REMINDER_COOLDOWN_HOURS = 24;
const BATCH_LIMIT = 150;

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

function hasElapsedHours(reference: Date | undefined, hours: number): boolean {
  if (!reference) return true;
  return Date.now() - reference.getTime() >= hours * 60 * 60 * 1000;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidates = await listLearningReminderCandidates(BATCH_LIMIT);
  if (candidates.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, message: "No candidates" });
  }

  const userIds = candidates.map((c) => c.userId);
  const states = await getLearningReminderStatesByUserIds(userIds);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const pushUserIds: string[] = [];

  for (const candidate of candidates) {
    const state = states.get(candidate.userId);
    if (
      state?.lastReminderSentAt &&
      !hasElapsedHours(state.lastReminderSentAt, REMINDER_COOLDOWN_HOURS)
    ) {
      skipped += 1;
      continue;
    }

    const fields = buildLearningReminderMergeFields({
      firstName: candidate.firstName,
      email: candidate.email,
      pendingSkills: candidate.pendingSkills,
      pendingCount: candidate.pendingCount,
      pendingLessons: candidate.pendingLessons,
    });
    const { subject, html } = renderLearningReminderEmail(fields);

    try {
      await sendResendHtmlEmail({
        to: candidate.email,
        subject,
        html,
        tags: [
          { name: "campaign", value: "learning_reminder" },
          { name: "user_id", value: candidate.userId },
        ],
      });
      await recordLearningReminderSent(candidate.userId);
      pushUserIds.push(candidate.userId);
      sent += 1;
    } catch (err) {
      errors.push(
        `${candidate.userId}: ${err instanceof Error ? err.message : "send failed"}`
      );
      skipped += 1;
    }
  }

  let pushSent = 0;
  for (const batch of chunkUserIds(pushUserIds)) {
    try {
      await sendPushwooshPracticeReminderToUsers(batch, {
        title: "Your CELPIP daily lesson is waiting",
        body: "Open the app to complete today's skill modules and move toward your target CLB.",
        route: "/learning",
      });
      pushSent += batch.length;
    } catch (err) {
      console.error("[learning-reminder] push batch failed", err);
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    pushSent,
    candidates: candidates.length,
    errors: errors.slice(0, 10),
  });
}
