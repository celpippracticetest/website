import "server-only";

import { ObjectId } from "bson";
import type { Sql } from "postgres";
import { getSql } from "@/lib/pg/pool";

export type UserActivityInsert = {
  mongoId?: string | null;
  userId: string;
  email?: string | null;
  eventType: string;
  context: string;
  skill?: string | null;
  attemptId?: string | null;
  contentId?: string | null;
  status?: string | null;
  durationSeconds?: number | null;
  scoreOverall?: number | null;
  scoreBreakdownJson?: string | null;
  llmTokensPrompt?: number | null;
  llmTokensCompletion?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceUaHash?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  timestampUtc?: Date | null;
};

export type UserActivityRow = {
  mongo_id: string;
  user_id: string;
  email: string | null;
  event_type: string;
  context: string;
  skill: string | null;
  attempt_id: string | null;
  content_id: string | null;
  status: string | null;
  duration_seconds: number | null;
  score_overall: number | null;
  score_breakdown_json: string | null;
  llm_tokens_prompt: number | null;
  llm_tokens_completion: number | null;
  ip_address: string | null;
  user_agent: string | null;
  device_ua_hash: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  timestamp_utc: Date;
  created_at: Date;
  updated_at: Date;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

export function newActivityMongoId(): string {
  return new ObjectId().toHexString();
}

function normalizeInsert(row: UserActivityInsert) {
  const now = row.timestampUtc ?? new Date();
  return {
    mongoId: row.mongoId?.trim() || newActivityMongoId(),
    userId: row.userId,
    email: row.email ?? null,
    eventType: row.eventType,
    context: row.context,
    skill: row.skill ?? null,
    attemptId: row.attemptId ?? null,
    contentId: row.contentId ?? null,
    status: row.status ?? null,
    durationSeconds:
      typeof row.durationSeconds === "number" && Number.isFinite(row.durationSeconds)
        ? Math.trunc(row.durationSeconds)
        : null,
    scoreOverall:
      typeof row.scoreOverall === "number" && Number.isFinite(row.scoreOverall)
        ? row.scoreOverall
        : null,
    scoreBreakdownJson: row.scoreBreakdownJson ?? null,
    llmTokensPrompt: Number(row.llmTokensPrompt || 0) || 0,
    llmTokensCompletion: Number(row.llmTokensCompletion || 0) || 0,
    ipAddress: row.ipAddress ?? null,
    userAgent: row.userAgent ?? null,
    deviceUaHash: row.deviceUaHash ?? null,
    notes: row.notes ?? null,
    metadata: JSON.stringify(asRecord(row.metadata)),
    timestampUtc: now,
  };
}

export async function insertUserActivity(
  row: UserActivityInsert,
  sqlClient?: Sql
): Promise<string> {
  const sql = sqlClient ?? getSql();
  const r = normalizeInsert(row);
  await sql`
    INSERT INTO public.user_activities (
      mongo_id, user_id, email, event_type, context, skill, attempt_id, content_id,
      status, duration_seconds, score_overall, score_breakdown_json,
      llm_tokens_prompt, llm_tokens_completion, ip_address, user_agent, device_ua_hash,
      notes, metadata, timestamp_utc, created_at, updated_at
    ) VALUES (
      ${r.mongoId}, ${r.userId}, ${r.email}, ${r.eventType}, ${r.context}, ${r.skill},
      ${r.attemptId}, ${r.contentId}, ${r.status}, ${r.durationSeconds}, ${r.scoreOverall},
      ${r.scoreBreakdownJson}, ${r.llmTokensPrompt}, ${r.llmTokensCompletion},
      ${r.ipAddress}, ${r.userAgent}, ${r.deviceUaHash}, ${r.notes},
      ${r.metadata}::jsonb, ${r.timestampUtc}, ${r.timestampUtc}, ${r.timestampUtc}
    )
    ON CONFLICT (mongo_id) DO NOTHING
  `;
  return r.mongoId;
}

export async function insertUserActivities(
  rows: UserActivityInsert[],
  sqlClient?: Sql
): Promise<void> {
  if (rows.length === 0) return;
  const sql = sqlClient ?? getSql();
  for (const row of rows) {
    await insertUserActivity(row, sql);
  }
}

export async function insertUserLearningEvent(
  input: {
    mongoId?: string | null;
    userId: string;
    eventType: string;
    context?: string | null;
    score?: number | null;
    deviceType?: string | null;
    occurredAt?: Date | null;
    metadata?: Record<string, unknown> | null;
  },
  sqlClient?: Sql
): Promise<void> {
  const sql = sqlClient ?? getSql();
  const mongoId = input.mongoId?.trim() || newActivityMongoId();
  const occurredAt = input.occurredAt ?? new Date();
  await sql`
    INSERT INTO public.user_learning_events (
      mongo_id, user_id, event_type, context, score, device_type, occurred_at, metadata, created_at, updated_at
    ) VALUES (
      ${mongoId},
      ${input.userId},
      ${input.eventType},
      ${input.context ?? null},
      ${typeof input.score === "number" && Number.isFinite(input.score) ? input.score : null},
      ${input.deviceType ?? null},
      ${occurredAt},
      ${JSON.stringify(asRecord(input.metadata))}::jsonb,
      ${occurredAt},
      ${occurredAt}
    )
    ON CONFLICT (mongo_id) DO NOTHING
  `;
}

export async function upsertUserActivityReminderEngaged(
  userId: string,
  engagedAt: Date = new Date(),
  sqlClient?: Sql
): Promise<void> {
  const sql = sqlClient ?? getSql();
  await sql`
    INSERT INTO public.user_activity_reminders (
      user_id, last_engaged_at, reminders_in_window, created_at, updated_at
    ) VALUES (
      ${userId}, ${engagedAt}, 0, ${engagedAt}, ${engagedAt}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      last_engaged_at = EXCLUDED.last_engaged_at,
      reminder_flow = NULL,
      reminder_stage_id = NULL,
      reminder_variant = NULL,
      reminder_window_started_at = NULL,
      reminders_in_window = 0,
      updated_at = EXCLUDED.updated_at
  `;
}

/** Convert a typed row into the legacy document shape used by older CMS UIs. */
export function userActivityRowToDocument(row: UserActivityRow): Record<string, unknown> {
  return {
    _id: row.mongo_id,
    id: row.mongo_id,
    userId: row.user_id,
    email: row.email,
    eventType: row.event_type,
    context: row.context,
    skill: row.skill,
    attemptId: row.attempt_id,
    contentId: row.content_id,
    status: row.status,
    durationSeconds: row.duration_seconds,
    scoreOverall: row.score_overall,
    scoreBreakdownJson: row.score_breakdown_json,
    llmTokensPrompt: row.llm_tokens_prompt,
    llmTokensCompletion: row.llm_tokens_completion,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    deviceUaHash: row.device_ua_hash,
    notes: row.notes,
    metadata: asRecord(row.metadata),
    timestampUtc: row.timestamp_utc,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ActivityMetricsRollup = {
  totalActivities: number;
  uniqueIpAddressesCount: number;
  uniqueUserAgentsCount: number;
  totalTokens: number;
  practiceAttempts: number;
  practiceCompletions: number;
  mockAttempts: number;
  mockCompletions: number;
  paymentEvents: number;
  disputeEvents: number;
  ipAddresses: string[];
  userAgents: string[];
  lastActivity: Date | null;
  firstActivity: Date | null;
};

export async function loadUserActivityMetricsByUserId(
  userIds: string[],
  sqlClient?: Sql
): Promise<Map<string, ActivityMetricsRollup>> {
  const sql = sqlClient ?? getSql();
  const byUserId = new Map<string, ActivityMetricsRollup>();
  const ids = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return byUserId;

  const rows = await sql<{
    user_id: string;
    total_activities: number;
    unique_ips: number;
    unique_uas: number;
    total_tokens: string | number;
    practice_attempts: number;
    practice_completions: number;
    mock_attempts: number;
    mock_completions: number;
    payment_events: number;
    dispute_events: number;
    ip_addresses: string[] | null;
    user_agents: string[] | null;
    last_activity: Date | null;
    first_activity: Date | null;
  }[]>`
    SELECT
      user_id,
      COUNT(*)::int AS total_activities,
      COUNT(DISTINCT NULLIF(TRIM(ip_address), ''))::int AS unique_ips,
      COUNT(DISTINCT NULLIF(TRIM(user_agent), ''))::int AS unique_uas,
      COALESCE(SUM(COALESCE(llm_tokens_prompt, 0) + COALESCE(llm_tokens_completion, 0)), 0) AS total_tokens,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_attempts,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completions,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_attempts,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_completions,
      COUNT(*) FILTER (
        WHERE event_type IN (
          'payment_successful', 'payment_failed', 'subscription_created', 'subscription_cancelled'
        )
      )::int AS payment_events,
      COUNT(*) FILTER (
        WHERE event_type IN ('dispute_created', 'dispute_resolved')
      )::int AS dispute_events,
      (
        ARRAY_AGG(DISTINCT NULLIF(TRIM(ip_address), ''))
        FILTER (WHERE NULLIF(TRIM(ip_address), '') IS NOT NULL)
      )[1:5] AS ip_addresses,
      (
        ARRAY_AGG(DISTINCT NULLIF(TRIM(user_agent), ''))
        FILTER (WHERE NULLIF(TRIM(user_agent), '') IS NOT NULL)
      )[1:3] AS user_agents,
      MAX(timestamp_utc) AS last_activity,
      MIN(timestamp_utc) AS first_activity
    FROM public.user_activities
    WHERE user_id = ANY(${ids})
    GROUP BY user_id
  `;

  for (const r of rows) {
    if (!r.user_id) continue;
    byUserId.set(r.user_id, {
      totalActivities: r.total_activities || 0,
      uniqueIpAddressesCount: r.unique_ips || 0,
      uniqueUserAgentsCount: r.unique_uas || 0,
      totalTokens: Number(r.total_tokens || 0) || 0,
      practiceAttempts: r.practice_attempts || 0,
      practiceCompletions: r.practice_completions || 0,
      mockAttempts: r.mock_attempts || 0,
      mockCompletions: r.mock_completions || 0,
      paymentEvents: r.payment_events || 0,
      disputeEvents: r.dispute_events || 0,
      ipAddresses: (r.ip_addresses || []).filter(Boolean),
      userAgents: (r.user_agents || []).filter(Boolean),
      lastActivity: r.last_activity,
      firstActivity: r.first_activity,
    });
  }

  return byUserId;
}

export async function listCompletedPracticeSkillsSince(
  userId: string,
  since: Date,
  sqlClient?: Sql
): Promise<{ skills: string[]; completedCount: number }> {
  const sql = sqlClient ?? getSql();
  const rows = await sql<{ skill: string | null }[]>`
    SELECT skill
    FROM public.user_activities
    WHERE user_id = ${userId}
      AND event_type = 'practice_attempt_completed'
      AND status = 'completed'
      AND timestamp_utc >= ${since}
  `;
  const skills = new Set<string>();
  for (const r of rows) {
    if (r.skill) skills.add(String(r.skill));
  }
  return { skills: [...skills], completedCount: rows.length };
}
