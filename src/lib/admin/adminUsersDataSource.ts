import "server-only";

import type { Sql } from "postgres";
import { resolveAppDocumentsPartitionKey } from "@/lib/pg/pgCollection";
import {
  hasPaidPracticeAccess,
  normalizePlan,
} from "@/lib/subscriptionAccess";

/** Keep paid plan tokens as stored; everything else → free for admin list. */
function normalizeAdminListPlan(planRaw: unknown): string {
  const plan = normalizePlan(typeof planRaw === "string" ? planRaw : null);
  if (!plan) return "free";
  if (hasPaidPracticeAccess(plan)) return plan;
  return "free";
}

const ADMIN_USERS_PAGE_SIZE_MAX = 100;

/** Default page size for admin user list (Supabase / SQL paginated paths). */
export function defaultAdminUsersPageLimit(): number {
  const raw = process.env.ADMIN_USERS_PAGE_SIZE?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) return Math.min(ADMIN_USERS_PAGE_SIZE_MAX, Math.floor(n));
  }
  return 50;
}

export function normalizeAdminUsersPageLimit(raw: string | null): number {
  const n = parseInt(raw ?? "", 10);
  if (Number.isFinite(n) && n >= 1) return Math.min(ADMIN_USERS_PAGE_SIZE_MAX, n);
  return defaultAdminUsersPageLimit();
}

export async function userProfilesTableExists(sql: Sql): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT to_regclass('public.user_profiles') IS NOT NULL AS exists
  `;
  return Boolean(rows[0]?.exists);
}

export type AdminUsersListParams = {
  search: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  subscriptionStatus: string;
};

type ProfileListRow = {
  stable_id: string;
  supabase_auth_user_id: string | null;
  legacy_clerk_user_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  plan: string | null;
  plan_type: string | null;
  public_metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

type ActivityMetrics = {
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

const EMPTY_ACTIVITY_METRICS: ActivityMetrics = {
  totalActivities: 0,
  uniqueIpAddressesCount: 0,
  uniqueUserAgentsCount: 0,
  totalTokens: 0,
  practiceAttempts: 0,
  practiceCompletions: 0,
  mockAttempts: 0,
  mockCompletions: 0,
  paymentEvents: 0,
  disputeEvents: 0,
  ipAddresses: [],
  userAgents: [],
  lastActivity: null,
  firstActivity: null,
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function uniqueNonEmpty(ids: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = (raw || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Page-scoped activity rollups from `useractivities` app_documents.
 * Avoids full-table aggregation used by the Mongo fallback path.
 */
async function loadActivityMetricsByUserId(
  sql: Sql,
  userIds: string[]
): Promise<Map<string, ActivityMetrics>> {
  const ids = uniqueNonEmpty(userIds);
  const byUserId = new Map<string, ActivityMetrics>();
  if (ids.length === 0) return byUserId;

  const activitiesKey = await resolveAppDocumentsPartitionKey(sql, "useractivities");

  // timestampUtc may be an ISO string or Mongo extended JSON: {"$date":"..."}.
  // Casting the raw text form fails and previously zeroed the whole admin list path.
  const activityTimestampSql = sql.unsafe(`
    COALESCE(
      CASE
        WHEN jsonb_typeof(body->'timestampUtc') = 'string'
          AND NULLIF(TRIM(body->>'timestampUtc'), '') ~ '^[0-9]{4}-'
          THEN (body->>'timestampUtc')::timestamptz
        WHEN jsonb_typeof(body->'timestampUtc') = 'object'
          AND NULLIF(TRIM(body#>>'{timestampUtc,$date}'), '') ~ '^[0-9]{4}-'
          THEN (body#>>'{timestampUtc,$date}')::timestamptz
        ELSE NULL
      END,
      updated_at
    )
  `);

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
      body->>'userId' AS user_id,
      COUNT(*)::int AS total_activities,
      COUNT(DISTINCT NULLIF(TRIM(body->>'ipAddress'), ''))::int AS unique_ips,
      COUNT(DISTINCT NULLIF(TRIM(body->>'userAgent'), ''))::int AS unique_uas,
      COALESCE(
        SUM(
          COALESCE(NULLIF(TRIM(body->>'llmTokensPrompt'), '')::int, 0)
          + COALESCE(NULLIF(TRIM(body->>'llmTokensCompletion'), '')::int, 0)
        ),
        0
      ) AS total_tokens,
      COUNT(*) FILTER (WHERE body->>'eventType' = 'practice_attempt_started')::int AS practice_attempts,
      COUNT(*) FILTER (WHERE body->>'eventType' = 'practice_attempt_completed')::int AS practice_completions,
      COUNT(*) FILTER (WHERE body->>'eventType' = 'mock_attempt_started')::int AS mock_attempts,
      COUNT(*) FILTER (WHERE body->>'eventType' = 'mock_attempt_completed')::int AS mock_completions,
      COUNT(*) FILTER (
        WHERE body->>'eventType' IN (
          'payment_successful',
          'payment_failed',
          'subscription_created',
          'subscription_cancelled'
        )
      )::int AS payment_events,
      COUNT(*) FILTER (
        WHERE body->>'eventType' IN ('dispute_created', 'dispute_resolved')
      )::int AS dispute_events,
      (
        ARRAY_AGG(DISTINCT NULLIF(TRIM(body->>'ipAddress'), ''))
        FILTER (WHERE NULLIF(TRIM(body->>'ipAddress'), '') IS NOT NULL)
      )[1:5] AS ip_addresses,
      (
        ARRAY_AGG(DISTINCT NULLIF(TRIM(body->>'userAgent'), ''))
        FILTER (WHERE NULLIF(TRIM(body->>'userAgent'), '') IS NOT NULL)
      )[1:3] AS user_agents,
      MAX(${activityTimestampSql}) AS last_activity,
      MIN(${activityTimestampSql}) AS first_activity
    FROM app_documents
    WHERE collection = ${activitiesKey}
      AND body->>'userId' = ANY(${ids})
    GROUP BY body->>'userId'
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

function mergeActivityMetrics(
  candidates: string[],
  byUserId: Map<string, ActivityMetrics>
): ActivityMetrics {
  const matched = uniqueNonEmpty(candidates)
    .map((id) => byUserId.get(id))
    .filter((m): m is ActivityMetrics => Boolean(m));
  if (matched.length === 0) return { ...EMPTY_ACTIVITY_METRICS };
  if (matched.length === 1) return matched[0]!;

  const ipSet = new Set<string>();
  const uaSet = new Set<string>();
  let lastActivity: Date | null = null;
  let firstActivity: Date | null = null;
  const merged = { ...EMPTY_ACTIVITY_METRICS };

  for (const m of matched) {
    merged.totalActivities += m.totalActivities;
    merged.totalTokens += m.totalTokens;
    merged.practiceAttempts += m.practiceAttempts;
    merged.practiceCompletions += m.practiceCompletions;
    merged.mockAttempts += m.mockAttempts;
    merged.mockCompletions += m.mockCompletions;
    merged.paymentEvents += m.paymentEvents;
    merged.disputeEvents += m.disputeEvents;
    for (const ip of m.ipAddresses) ipSet.add(ip);
    for (const ua of m.userAgents) uaSet.add(ua);
    if (
      m.lastActivity &&
      (!lastActivity || m.lastActivity.getTime() > lastActivity.getTime())
    ) {
      lastActivity = m.lastActivity;
    }
    if (
      m.firstActivity &&
      (!firstActivity || m.firstActivity.getTime() < firstActivity.getTime())
    ) {
      firstActivity = m.firstActivity;
    }
  }

  merged.ipAddresses = [...ipSet].slice(0, 5);
  merged.userAgents = [...uaSet].slice(0, 3);
  merged.uniqueIpAddressesCount = ipSet.size;
  merged.uniqueUserAgentsCount = uaSet.size;
  merged.lastActivity = lastActivity;
  merged.firstActivity = firstActivity;
  return merged;
}

function orderBySql(sortBy: string, sortOrder: "asc" | "desc"): string {
  const dir = sortOrder === "asc" ? "ASC" : "DESC";
  switch (sortBy) {
    case "createdAt":
      return `p.created_at ${dir} NULLS LAST, p.id`;
    case "plan":
      return `lower(trim(coalesce(p.plan, ''))) ${dir} NULLS LAST, p.id`;
    case "totalSpend": {
      const spendExpr =
        "NULLIF(TRIM(COALESCE(p.public_metadata->>'totalSpend', '')), '')::numeric";
      return `${spendExpr} ${dir} NULLS LAST, p.id`;
    }
    case "totalActivities":
    case "riskScore":
      return `p.updated_at ${dir} NULLS LAST, p.id`;
    case "lastActivity":
    default:
      return `p.updated_at ${dir} NULLS LAST, p.id`;
  }
}

/**
 * Paginated admin user list from Supabase Postgres `public.user_profiles`
 * (`LIMIT` / `OFFSET` — never loads the full table into the app server).
 * Activity / IP / token metrics are joined for the current page only.
 */
export async function listAdminUsersFromUserProfiles(
  sql: Sql,
  params: AdminUsersListParams
): Promise<{ rows: unknown[]; totalCount: number }> {
  const { search, page, limit, sortBy, sortOrder, subscriptionStatus } = params;
  const offset = (page - 1) * limit;
  const q = search.trim();
  const order = orderBySql(sortBy, sortOrder);

  let subFilter = sql``;
  if (subscriptionStatus === "active") {
    subFilter = sql`AND lower(trim(coalesce(p.plan, ''))) IN ('plus', 'premium', 'pro', 'enterprise')`;
  } else if (subscriptionStatus === "never") {
    subFilter = sql`AND lower(trim(coalesce(p.plan, ''))) NOT IN ('plus', 'premium', 'pro', 'enterprise')
      AND (p.public_metadata->>'purchaseDate') IS NULL`;
  } else if (subscriptionStatus === "unsubscribed") {
    subFilter = sql`AND lower(trim(coalesce(p.plan, ''))) NOT IN ('plus', 'premium', 'pro', 'enterprise')
      AND (p.public_metadata->>'purchaseDate') IS NOT NULL`;
  }

  let searchFilter = sql``;
  if (q.length > 0) {
    const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    searchFilter = sql`AND (
      p.email ILIKE ${like}
      OR p.id::text ILIKE ${like}
      OR COALESCE(p.legacy_clerk_user_id, '') ILIKE ${like}
      OR COALESCE(p.supabase_auth_user_id::text, '') ILIKE ${like}
      OR COALESCE(p.first_name, '') ILIKE ${like}
      OR COALESCE(p.last_name, '') ILIKE ${like}
    )`;
  }

  const countRows = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c
    FROM public.user_profiles p
    WHERE 1 = 1
    ${subFilter}
    ${searchFilter}
  `;
  const totalCount = countRows[0]?.c ?? 0;

  const dataRows = await sql<ProfileListRow[]>`
    SELECT
      COALESCE(
        NULLIF(TRIM(p.legacy_clerk_user_id), ''),
        NULLIF(TRIM(p.supabase_auth_user_id::text), ''),
        p.id::text
      ) AS stable_id,
      p.supabase_auth_user_id::text AS supabase_auth_user_id,
      p.legacy_clerk_user_id,
      p.email,
      p.first_name,
      p.last_name,
      p.plan,
      p.plan_type,
      p.public_metadata,
      p.created_at,
      p.updated_at
    FROM public.user_profiles p
    WHERE 1 = 1
    ${subFilter}
    ${searchFilter}
    ORDER BY ${sql.unsafe(order)}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const activityIdCandidates = dataRows.flatMap((r) => [
    r.stable_id,
    r.supabase_auth_user_id,
    r.legacy_clerk_user_id,
  ]);
  let activityByUserId = new Map<string, ActivityMetrics>();
  try {
    activityByUserId = await loadActivityMetricsByUserId(
      sql,
      activityIdCandidates
    );
  } catch (e) {
    console.warn(
      "[admin/users] activity metrics join failed; returning profiles with zeroed activity:",
      e instanceof Error ? e.message : e
    );
  }

  const rows = dataRows.map((r) => {
    const meta = asRecord(r.public_metadata);
    const plan = normalizeAdminListPlan(r.plan ?? meta.plan ?? "free");
    const activity = mergeActivityMetrics(
      [r.stable_id, r.supabase_auth_user_id, r.legacy_clerk_user_id],
      activityByUserId
    );
    return {
      _id: r.stable_id,
      email: r.email ?? null,
      firstName: r.first_name,
      lastName: r.last_name,
      lastActivity: activity.lastActivity ?? r.updated_at,
      firstActivity: activity.firstActivity ?? r.created_at,
      createdAt: r.created_at,
      totalActivities: activity.totalActivities,
      uniqueIpAddressesCount: activity.uniqueIpAddressesCount,
      uniqueUserAgentsCount: activity.uniqueUserAgentsCount,
      totalTokens: activity.totalTokens,
      practiceAttempts: activity.practiceAttempts,
      practiceCompletions: activity.practiceCompletions,
      mockAttempts: activity.mockAttempts,
      mockCompletions: activity.mockCompletions,
      paymentEvents: activity.paymentEvents,
      disputeEvents: activity.disputeEvents,
      ipAddresses: activity.ipAddresses,
      userAgents: activity.userAgents,
      plan,
      planType: r.plan_type ?? (meta.planType as string | undefined) ?? null,
      purchaseAmount: Number(meta.purchaseAmount ?? 0) || 0,
      purchaseCurrency: String(meta.purchaseCurrency ?? "CAD"),
      totalSpend: Number(meta.totalSpend ?? 0) || 0,
      utm_source: (meta.utm_source as string | undefined) ?? null,
      utm_medium: (meta.utm_medium as string | undefined) ?? null,
      utm_campaign: (meta.utm_campaign as string | undefined) ?? null,
      gclid: (meta.gclid as string | undefined) ?? null,
      planCancelled: Boolean(meta.planCancelled),
      publicMetadataPurchaseDate: meta.purchaseDate ?? null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      subscriptionDurationDays: null,
      subscriptionHistory: [] as { type: string; date: unknown }[],
    };
  });

  return { rows, totalCount };
}

type UsersDocRow = {
  mongo_id: string;
  body: Record<string, unknown>;
  updated_at: Date;
};

function orderByUsersDocSql(sortBy: string, sortOrder: "asc" | "desc"): string {
  const dir = sortOrder === "asc" ? "ASC" : "DESC";
  switch (sortBy) {
    case "createdAt":
      return `(NULLIF(d.body->>'createdAt',''))::timestamptz ${dir} NULLS LAST, d.updated_at ${dir}, d.mongo_id`;
    case "plan":
      return `lower(trim(coalesce(d.body->>'plan', ''))) ${dir} NULLS LAST, d.mongo_id`;
    case "totalSpend": {
      const spend =
        "NULLIF(TRIM(COALESCE(d.body#>>'{publicMetadata,totalSpend}', '')), '')::numeric";
      return `${spend} ${dir} NULLS LAST, d.mongo_id`;
    }
    case "totalActivities":
    case "riskScore":
    case "lastActivity":
    default:
      return `d.updated_at ${dir} NULLS LAST, d.mongo_id`;
  }
}

/**
 * Fallback: paginate `users` app_documents, then attach page-scoped activity metrics.
 */
export async function listAdminUsersFromUsersDocuments(
  sql: Sql,
  params: AdminUsersListParams
): Promise<{ rows: unknown[]; totalCount: number }> {
  const { search, page, limit, sortBy, sortOrder, subscriptionStatus } = params;
  const offset = (page - 1) * limit;
  const q = search.trim();
  const usersKey = await resolveAppDocumentsPartitionKey(sql, "users");
  const order = orderByUsersDocSql(sortBy, sortOrder);

  let subFilter = sql``;
  if (subscriptionStatus === "active") {
    subFilter = sql`AND lower(trim(coalesce(d.body->>'plan', ''))) IN ('plus', 'premium', 'pro', 'enterprise')`;
  } else if (subscriptionStatus === "never") {
    subFilter = sql`AND lower(trim(coalesce(d.body->>'plan', ''))) NOT IN ('plus', 'premium', 'pro', 'enterprise')
      AND (d.body#>>'{publicMetadata,purchaseDate}') IS NULL`;
  } else if (subscriptionStatus === "unsubscribed") {
    subFilter = sql`AND lower(trim(coalesce(d.body->>'plan', ''))) NOT IN ('plus', 'premium', 'pro', 'enterprise')
      AND (d.body#>>'{publicMetadata,purchaseDate}') IS NOT NULL`;
  }

  let searchFilter = sql``;
  if (q.length > 0) {
    const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    searchFilter = sql`AND (
      COALESCE(d.body->>'email', '') ILIKE ${like}
      OR d.mongo_id ILIKE ${like}
      OR COALESCE(d.body->>'supabaseUserId', '') ILIKE ${like}
      OR COALESCE(d.body->>'clerkUserId', '') ILIKE ${like}
      OR COALESCE(d.body->>'sub', '') ILIKE ${like}
      OR COALESCE(d.body->>'firstName', '') ILIKE ${like}
      OR COALESCE(d.body->>'lastName', '') ILIKE ${like}
    )`;
  }

  const countRows = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c
    FROM app_documents d
    WHERE d.collection = ${usersKey}
    ${subFilter}
    ${searchFilter}
  `;
  const totalCount = countRows[0]?.c ?? 0;

  const dataRows = await sql<UsersDocRow[]>`
    SELECT d.mongo_id, d.body::jsonb AS body, d.updated_at
    FROM app_documents d
    WHERE d.collection = ${usersKey}
    ${subFilter}
    ${searchFilter}
    ORDER BY ${sql.unsafe(order)}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const mapped = dataRows.map((r) => {
    const b = asRecord(r.body);
    const meta = asRecord(b.publicMetadata);
    const supabaseUserId =
      typeof b.supabaseUserId === "string" ? b.supabaseUserId.trim() : "";
    const sub = typeof b.sub === "string" ? b.sub.trim() : "";
    const clerkUserId =
      typeof b.clerkUserId === "string" ? b.clerkUserId.trim() : "";
    const stable =
      supabaseUserId || sub || clerkUserId || r.mongo_id;
    const plan = normalizeAdminListPlan(b.plan ?? meta.plan ?? "free");
    const created =
      b.createdAt != null
        ? new Date(String(b.createdAt))
        : r.updated_at;
    return {
      _id: stable,
      activityIds: uniqueNonEmpty([stable, supabaseUserId, sub, clerkUserId]),
      email: (b.email as string | undefined) ?? null,
      firstName: b.firstName,
      lastName: b.lastName,
      lastActivity: r.updated_at,
      firstActivity: created,
      createdAt: created,
      plan,
      planType: (b.planType as string | undefined) ?? (meta.planType as string | undefined) ?? null,
      purchaseAmount: Number(meta.purchaseAmount ?? b.purchaseAmount ?? 0) || 0,
      purchaseCurrency: String(meta.purchaseCurrency ?? b.purchaseCurrency ?? "CAD"),
      totalSpend: Number(meta.totalSpend ?? b.totalSpend ?? 0) || 0,
      utm_source: (meta.utm_source as string | undefined) ?? null,
      utm_medium: (meta.utm_medium as string | undefined) ?? null,
      utm_campaign: (meta.utm_campaign as string | undefined) ?? null,
      gclid: (meta.gclid as string | undefined) ?? null,
      planCancelled: Boolean(meta.planCancelled),
      publicMetadataPurchaseDate: meta.purchaseDate ?? null,
      subscriptionStartDate: b.subscriptionStartDate ?? null,
      subscriptionEndDate: b.subscriptionEndDate ?? null,
      subscriptionDurationDays: b.subscriptionDurationDays ?? null,
      subscriptionHistory: [] as { type: string; date: unknown }[],
    };
  });

  let activityByUserId = new Map<string, ActivityMetrics>();
  try {
    activityByUserId = await loadActivityMetricsByUserId(
      sql,
      mapped.flatMap((r) => r.activityIds)
    );
  } catch (e) {
    console.warn(
      "[admin/users] activity metrics join failed (users docs path); returning zeroed activity:",
      e instanceof Error ? e.message : e
    );
  }

  const rows = mapped.map(({ activityIds, ...r }) => {
    const activity = mergeActivityMetrics(activityIds, activityByUserId);
    return {
      ...r,
      lastActivity: activity.lastActivity ?? r.lastActivity,
      firstActivity: activity.firstActivity ?? r.firstActivity,
      totalActivities: activity.totalActivities,
      uniqueIpAddressesCount: activity.uniqueIpAddressesCount,
      uniqueUserAgentsCount: activity.uniqueUserAgentsCount,
      totalTokens: activity.totalTokens,
      practiceAttempts: activity.practiceAttempts,
      practiceCompletions: activity.practiceCompletions,
      mockAttempts: activity.mockAttempts,
      mockCompletions: activity.mockCompletions,
      paymentEvents: activity.paymentEvents,
      disputeEvents: activity.disputeEvents,
      ipAddresses: activity.ipAddresses,
      userAgents: activity.userAgents,
    };
  });

  return { rows, totalCount };
}
