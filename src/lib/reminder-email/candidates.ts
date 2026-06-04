import "server-only";

import {
  filterValidUserRows,
  listRecentAuthUsers,
  loadActivitySummariesByUserIds,
  loadUserActivityRemindersByUserIds,
} from "@/lib/email-cron/sql-audience";
export const REMINDER_CANDIDATE_LOOKBACK_DAYS = 30;

export type ReminderFlow = "signup_no_activity" | "inactive";

export type ReminderCandidate = {
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

/**
 * Loads reminder candidates without mingo `$lookup` (which preloads all user_activities).
 */
export async function listReminderCandidates(limit: number): Promise<ReminderCandidate[]> {
  const minSignupAt = new Date(
    Date.now() - REMINDER_CANDIDATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  );

  const userRows = filterValidUserRows(
    await listRecentAuthUsers({ minSignupAt, limit, freeOnly: false })
  );
  if (userRows.length === 0) {
    return [];
  }

  const userIds = userRows.map((row) => row.user_id);
  const [activityByUser, stateByUser] = await Promise.all([
    loadActivitySummariesByUserIds(userIds),
    loadUserActivityRemindersByUserIds(userIds),
  ]);

  return userRows.map((row) => {
    const activity = activityByUser.get(row.user_id);
    const state = stateByUser.get(row.user_id);
    return {
      userId: row.user_id,
      signupAt: row.signup_at,
      lastActivityAt: activity?.lastActivityAt,
      activityCount: activity?.activityCount ?? 0,
      isSubscribed: row.is_subscribed,
      lastReminderSentAt: state?.lastReminderSentAt,
      reminderFlow:
        state?.reminderFlow === "signup_no_activity" || state?.reminderFlow === "inactive"
          ? state.reminderFlow
          : undefined,
      reminderStageId: state?.reminderStageId,
      lastEngagedAt: state?.lastEngagedAt,
      reminderWindowStartedAt: state?.reminderWindowStartedAt,
      remindersInWindow: state?.remindersInWindow,
    };
  });
}
