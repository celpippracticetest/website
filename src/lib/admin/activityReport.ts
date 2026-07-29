import "server-only";

import { getSql } from "@/lib/pg/pool";

export type ActivityReportParams = {
  startDate: Date;
  endDate: Date;
  topLimit?: number;
};

export type ActivityFunnelBlock = {
  started: number;
  completed: number;
  completionRate: number;
  distinctUsersStarted: number;
  distinctUsersCompleted: number;
};

export type ActivityReportResult = {
  range: { startDate: string; endDate: string };
  practice: ActivityFunnelBlock;
  mock: ActivityFunnelBlock;
  perUserAverages: {
    activeUsers: number;
    practicesStartedPerActiveUser: number;
    practicesCompletedPerActiveUser: number;
    mocksStartedPerActiveUser: number;
    mocksCompletedPerActiveUser: number;
    mocksStartedPerMockUser: number;
    mocksCompletedPerMockUser: number;
  };
  bySkill: Array<{
    skill: string;
    practiceStarted: number;
    practiceCompleted: number;
    mockStarted: number;
    mockCompleted: number;
  }>;
  daily: Array<{
    day: string;
    practiceStarted: number;
    practiceCompleted: number;
    mockStarted: number;
    mockCompleted: number;
  }>;
  topUsers: Array<{
    userId: string;
    email: string | null;
    practiceStarted: number;
    practiceCompleted: number;
    mockStarted: number;
    mockCompleted: number;
    totalEvents: number;
  }>;
  answersSupplement: {
    practiceAnswers: number;
    examAnswers: number;
    distinctPracticeUsers: number;
    distinctExamUsers: number;
    note: string;
  };
};

function rate(num: number, den: number): number {
  if (!den) return 0;
  return parseFloat(((num / den) * 100).toFixed(2));
}

function avg(num: number, den: number): number {
  if (!den) return 0;
  return parseFloat((num / den).toFixed(2));
}

function funnel(
  started: number,
  completed: number,
  distinctUsersStarted: number,
  distinctUsersCompleted: number
): ActivityFunnelBlock {
  return {
    started,
    completed,
    completionRate: rate(completed, started),
    distinctUsersStarted,
    distinctUsersCompleted,
  };
}

export async function getActivityReport(
  params: ActivityReportParams
): Promise<ActivityReportResult> {
  const sql = getSql();
  const startDate = params.startDate;
  const endDate = params.endDate;
  const topLimit = Math.min(Math.max(params.topLimit ?? 25, 1), 100);

  const [totals] = await sql<{
    practice_started: number;
    practice_completed: number;
    mock_started: number;
    mock_completed: number;
    practice_users_started: number;
    practice_users_completed: number;
    mock_users_started: number;
    mock_users_completed: number;
    active_users: number;
  }[]>`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_started,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completed,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_started,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_completed,
      COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_users_started,
      COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_users_completed,
      COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_users_started,
      COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_users_completed,
      COUNT(DISTINCT user_id) FILTER (
        WHERE event_type IN (
          'practice_attempt_started', 'practice_attempt_completed',
          'mock_attempt_started', 'mock_attempt_completed'
        )
      )::int AS active_users
    FROM public.user_activities
    WHERE timestamp_utc >= ${startDate}
      AND timestamp_utc <= ${endDate}
  `;

  const bySkill = await sql<{
    skill: string;
    practice_started: number;
    practice_completed: number;
    mock_started: number;
    mock_completed: number;
  }[]>`
    SELECT
      COALESCE(NULLIF(TRIM(skill), ''), 'Unknown') AS skill,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_started,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completed,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_started,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_completed
    FROM public.user_activities
    WHERE timestamp_utc >= ${startDate}
      AND timestamp_utc <= ${endDate}
      AND event_type IN (
        'practice_attempt_started', 'practice_attempt_completed',
        'mock_attempt_started', 'mock_attempt_completed'
      )
    GROUP BY 1
    ORDER BY (COUNT(*)) DESC
  `;

  const daily = await sql<{
    day: string;
    practice_started: number;
    practice_completed: number;
    mock_started: number;
    mock_completed: number;
  }[]>`
    SELECT
      to_char(date_trunc('day', timestamp_utc AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_started,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completed,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_started,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_completed
    FROM public.user_activities
    WHERE timestamp_utc >= ${startDate}
      AND timestamp_utc <= ${endDate}
      AND event_type IN (
        'practice_attempt_started', 'practice_attempt_completed',
        'mock_attempt_started', 'mock_attempt_completed'
      )
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const topUsers = await sql<{
    user_id: string;
    email: string | null;
    practice_started: number;
    practice_completed: number;
    mock_started: number;
    mock_completed: number;
    total_events: number;
  }[]>`
    WITH ranked AS (
      SELECT
        a.user_id,
        COUNT(*) FILTER (WHERE a.event_type = 'practice_attempt_started')::int AS practice_started,
        COUNT(*) FILTER (WHERE a.event_type = 'practice_attempt_completed')::int AS practice_completed,
        COUNT(*) FILTER (WHERE a.event_type = 'mock_attempt_started')::int AS mock_started,
        COUNT(*) FILTER (WHERE a.event_type = 'mock_attempt_completed')::int AS mock_completed,
        COUNT(*) FILTER (
          WHERE a.event_type IN (
            'practice_attempt_started', 'practice_attempt_completed',
            'mock_attempt_started', 'mock_attempt_completed'
          )
        )::int AS total_events
      FROM public.user_activities a
      WHERE a.timestamp_utc >= ${startDate}
        AND a.timestamp_utc <= ${endDate}
        AND a.event_type IN (
          'practice_attempt_started', 'practice_attempt_completed',
          'mock_attempt_started', 'mock_attempt_completed'
        )
      GROUP BY a.user_id
      ORDER BY total_events DESC
      LIMIT ${topLimit}
    )
    SELECT
      r.user_id,
      COALESCE(
        (
          SELECT p.email
          FROM public.user_profiles p
          WHERE p.supabase_auth_user_id::text = r.user_id
             OR p.legacy_clerk_user_id = r.user_id
             OR (p.legacy_body ->> 'sub') = r.user_id
          ORDER BY p.updated_at DESC
          LIMIT 1
        ),
        (
          SELECT a.email
          FROM public.user_activities a
          WHERE a.user_id = r.user_id
            AND NULLIF(TRIM(a.email), '') IS NOT NULL
          ORDER BY a.timestamp_utc DESC
          LIMIT 1
        )
      ) AS email,
      r.practice_started,
      r.practice_completed,
      r.mock_started,
      r.mock_completed,
      r.total_events
    FROM ranked r
    ORDER BY r.total_events DESC
  `;

  let answersSupplement = {
    practiceAnswers: 0,
    examAnswers: 0,
    distinctPracticeUsers: 0,
    distinctExamUsers: 0,
    note: "Counts from public.answers in the same date range (includes Flutter users who may not emit activity events).",
  };

  try {
    const answersExist = await sql`
      SELECT to_regclass('public.answers') IS NOT NULL AS exists
    `;
    if (answersExist[0]?.exists) {
      const [ans] = await sql<{
        practice_answers: number;
        exam_answers: number;
        practice_users: number;
        exam_users: number;
      }[]>`
        SELECT
          COUNT(*) FILTER (WHERE practice_id IS NOT NULL)::int AS practice_answers,
          COUNT(*) FILTER (WHERE exam_id IS NOT NULL)::int AS exam_answers,
          COUNT(DISTINCT user_id) FILTER (WHERE practice_id IS NOT NULL)::int AS practice_users,
          COUNT(DISTINCT user_id) FILTER (WHERE exam_id IS NOT NULL)::int AS exam_users
        FROM public.answers
        WHERE created_at >= ${startDate}
          AND created_at <= ${endDate}
      `;
      answersSupplement = {
        practiceAnswers: ans?.practice_answers || 0,
        examAnswers: ans?.exam_answers || 0,
        distinctPracticeUsers: ans?.practice_users || 0,
        distinctExamUsers: ans?.exam_users || 0,
        note: answersSupplement.note,
      };
    }
  } catch (e) {
    console.warn("[activity report] answers supplement unavailable", e);
  }

  const t = totals || {
    practice_started: 0,
    practice_completed: 0,
    mock_started: 0,
    mock_completed: 0,
    practice_users_started: 0,
    practice_users_completed: 0,
    mock_users_started: 0,
    mock_users_completed: 0,
    active_users: 0,
  };

  return {
    range: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    practice: funnel(
      t.practice_started,
      t.practice_completed,
      t.practice_users_started,
      t.practice_users_completed
    ),
    mock: funnel(
      t.mock_started,
      t.mock_completed,
      t.mock_users_started,
      t.mock_users_completed
    ),
    perUserAverages: {
      activeUsers: t.active_users,
      practicesStartedPerActiveUser: avg(t.practice_started, t.active_users),
      practicesCompletedPerActiveUser: avg(t.practice_completed, t.active_users),
      mocksStartedPerActiveUser: avg(t.mock_started, t.active_users),
      mocksCompletedPerActiveUser: avg(t.mock_completed, t.active_users),
      mocksStartedPerMockUser: avg(t.mock_started, t.mock_users_started),
      mocksCompletedPerMockUser: avg(t.mock_completed, t.mock_users_started),
    },
    bySkill: bySkill.map((r) => ({
      skill: r.skill,
      practiceStarted: r.practice_started,
      practiceCompleted: r.practice_completed,
      mockStarted: r.mock_started,
      mockCompleted: r.mock_completed,
    })),
    daily: daily.map((r) => ({
      day: r.day,
      practiceStarted: r.practice_started,
      practiceCompleted: r.practice_completed,
      mockStarted: r.mock_started,
      mockCompleted: r.mock_completed,
    })),
    topUsers: topUsers.map((r) => ({
      userId: r.user_id,
      email: r.email,
      practiceStarted: r.practice_started,
      practiceCompleted: r.practice_completed,
      mockStarted: r.mock_started,
      mockCompleted: r.mock_completed,
      totalEvents: r.total_events,
    })),
    answersSupplement,
  };
}
