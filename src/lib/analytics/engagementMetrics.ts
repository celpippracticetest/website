import { getSql } from "@/lib/pg/pool";

export interface EngagementMetrics {
  practiceAttempts: number;
  practiceCompletions: number;
  practiceCompletionRate: number;
  examAttempts: number;
  examCompletions: number;
  examCompletionRate: number;
}

export async function getEngagementMetrics(
  startDate: Date,
  endDate: Date,
): Promise<EngagementMetrics> {
  try {
    const sql = getSql();
    const rows = await sql<{
      practice_attempts: number;
      practice_completions: number;
      exam_attempts: number;
      exam_completions: number;
    }[]>`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_attempts,
        COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completions,
        COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS exam_attempts,
        COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS exam_completions
      FROM public.user_activities
      WHERE timestamp_utc >= ${startDate}
        AND timestamp_utc <= ${endDate}
    `;

    const row = rows[0] || {
      practice_attempts: 0,
      practice_completions: 0,
      exam_attempts: 0,
      exam_completions: 0,
    };

    const practiceAttempts = row.practice_attempts || 0;
    const practiceCompletions = row.practice_completions || 0;
    const examAttempts = row.exam_attempts || 0;
    const examCompletions = row.exam_completions || 0;

    return {
      practiceAttempts,
      practiceCompletions,
      practiceCompletionRate:
        practiceAttempts > 0
          ? parseFloat(((practiceCompletions / practiceAttempts) * 100).toFixed(2))
          : 0,
      examAttempts,
      examCompletions,
      examCompletionRate:
        examAttempts > 0
          ? parseFloat(((examCompletions / examAttempts) * 100).toFixed(2))
          : 0,
    };
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    return {
      practiceAttempts: 0,
      practiceCompletions: 0,
      practiceCompletionRate: 0,
      examAttempts: 0,
      examCompletions: 0,
      examCompletionRate: 0,
    };
  }
}
