/** Persists hero `ScoreDiagnostic` choices for the post–sign-up onboarding survey. */
export const PENDING_HOME_DIAGNOSTIC_KEY = "pending_home_diagnostic";

export type PendingHomeDiagnostic = {
  /** Matches `ScoreDiagnostic` select: "7" | "8" | "9" | "10" (CLB 10+) */
  targetClb: string;
  /** ISO date string from `<input type="date" />`, if set */
  examDateIso?: string;
};

/**
 * Maps an exam calendar date to `OnboardingSurvey` `TEST_DATE_OPTIONS` buckets.
 */
export function mapExamDateIsoToSurveyTestDate(iso: string): string | null {
  const exam = new Date(iso);
  if (Number.isNaN(exam.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exam.setHours(0, 0, 0, 0);

  const msPerDay = 864e5;
  const days = Math.round((exam.getTime() - today.getTime()) / msPerDay);

  if (days < 0) return "In less than 2 weeks";
  if (days <= 14) return "In less than 2 weeks";
  if (days <= 45) return "In 1 month";
  return "In 2+ months";
}

export function targetClbStringToSkillScore(targetClb: string): number | null {
  const n = Number.parseInt(targetClb, 10);
  if (!Number.isFinite(n)) return null;
  if (n < 5 || n > 12) return null;
  return n;
}
