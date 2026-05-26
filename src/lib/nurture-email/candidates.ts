import "server-only";

import type { NurtureTriggerType } from "@/lib/nurture-email/config";
import type { NurtureCandidate } from "@/lib/nurture-email/stage-scheduler";
import {
  filterValidUserRows,
  listRecentAuthUsers,
  loadActivitySummariesByUserIds,
  loadAppDocumentsByUserIds,
} from "@/lib/email-cron/sql-audience";

const NURTURE_STATE_COLLECTION = "usernurturestates";
export const NURTURE_CANDIDATE_LOOKBACK_DAYS = 60;

type NurtureStateDoc = {
  userId?: string;
  lastNurtureSentAt?: Date;
  nurtureFlow?: NurtureTriggerType;
  nurtureStageId?: string;
  nurtureWindowStartedAt?: Date;
  nurturesInWindow?: number;
};

/**
 * Loads nurture candidates without mingo `$lookup` (which preloads all user_activities).
 */
export async function listNurtureCandidates(limit: number): Promise<NurtureCandidate[]> {
  const minSignupAt = new Date(
    Date.now() - NURTURE_CANDIDATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  );

  const userRows = filterValidUserRows(
    await listRecentAuthUsers({ minSignupAt, limit, freeOnly: true })
  );
  if (userRows.length === 0) {
    return [];
  }

  const userIds = userRows.map((row) => row.user_id);
  const [activityByUser, stateByUser] = await Promise.all([
    loadActivitySummariesByUserIds(userIds),
    loadAppDocumentsByUserIds<NurtureStateDoc>(NURTURE_STATE_COLLECTION, userIds),
  ]);

  return userRows.map((row) => {
    const activity = activityByUser.get(row.user_id);
    const state = stateByUser.get(row.user_id);
    return {
      userId: row.user_id,
      signupAt: row.signup_at,
      firstActivityAt: activity?.firstActivityAt,
      lastActivityAt: activity?.lastActivityAt,
      activityCount: activity?.activityCount ?? 0,
      isSubscribed: false,
      lastNurtureSentAt: state?.lastNurtureSentAt,
      nurtureFlow: state?.nurtureFlow,
      nurtureStageId: state?.nurtureStageId,
      nurtureWindowStartedAt: state?.nurtureWindowStartedAt,
      nurturesInWindow: state?.nurturesInWindow,
    };
  });
}
