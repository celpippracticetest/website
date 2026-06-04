import "server-only";

import type { Sql } from "postgres";
import { resolveAppDocumentsPartitionKey } from "@/lib/pg/pgCollection";

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
  legacy_clerk_user_id: string | null;
  supabase_auth_user_id: string | null;
  profile_id: string;
  app_document_mongo_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  plan: string | null;
  plan_type: string | null;
  public_metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

type UserActivityStatsRow = {
  user_id: string;
  total_activities: number;
  total_tokens: string | number;
  practice_attempts: number;
  practice_completions: number;
  mock_attempts: number;
  mock_completions: number;
  payment_events: number;
  dispute_events: number;
  unique_ip_addresses_count: number;
  unique_user_agents_count: number;
  last_activity: Date | null;
  first_activity: Date | null;
  ip_addresses: string[] | null;
  user_agents: string[] | null;
};

export type AdminUserActivityStats = {
  totalActivities: number;
  totalTokens: number;
  practiceAttempts: number;
  practiceCompletions: number;
  mockAttempts: number;
  mockCompletions: number;
  paymentEvents: number;
  disputeEvents: number;
  uniqueIpAddressesCount: number;
  uniqueUserAgentsCount: number;
  lastActivity: Date | null;
  firstActivity: Date | null;
  ipAddresses: string[];
  userAgents: string[];
};

const EMPTY_ACTIVITY_STATS: AdminUserActivityStats = {
  totalActivities: 0,
  totalTokens: 0,
  practiceAttempts: 0,
  practiceCompletions: 0,
  mockAttempts: 0,
  mockCompletions: 0,
  paymentEvents: 0,
  disputeEvents: 0,
  uniqueIpAddressesCount: 0,
  uniqueUserAgentsCount: 0,
  lastActivity: null,
  firstActivity: null,
  ipAddresses: [],
  userAgents: [],
};

async function userActivitiesTableExists(sql: Sql): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT to_regclass('public.user_activities') IS NOT NULL AS exists
  `;
  return Boolean(rows[0]?.exists);
}

function uniqueNonEmptyIds(ids: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const id of ids) {
    const trimmed = typeof id === "string" ? id.trim() : "";
    if (trimmed.length > 0) set.add(trimmed);
  }
  return [...set];
}

function asInt(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function rowToActivityStats(row: UserActivityStatsRow): AdminUserActivityStats {
  return {
    totalActivities: row.total_activities ?? 0,
    totalTokens: asInt(row.total_tokens),
    practiceAttempts: row.practice_attempts ?? 0,
    practiceCompletions: row.practice_completions ?? 0,
    mockAttempts: row.mock_attempts ?? 0,
    mockCompletions: row.mock_completions ?? 0,
    paymentEvents: row.payment_events ?? 0,
    disputeEvents: row.dispute_events ?? 0,
    uniqueIpAddressesCount: row.unique_ip_addresses_count ?? 0,
    uniqueUserAgentsCount: row.unique_user_agents_count ?? 0,
    lastActivity: row.last_activity ?? null,
    firstActivity: row.first_activity ?? null,
    ipAddresses: Array.isArray(row.ip_addresses) ? row.ip_addresses.filter(Boolean) : [],
    userAgents: Array.isArray(row.user_agents) ? row.user_agents.filter(Boolean) : [],
  };
}

/** Batch aggregate from `public.user_activities` keyed by `user_id`. */
export async function fetchActivityStatsByUserIds(
  sql: Sql,
  userIds: string[]
): Promise<Map<string, AdminUserActivityStats>> {
  const uniqueIds = uniqueNonEmptyIds(userIds);
  if (uniqueIds.length === 0) return new Map();

  const exists = await userActivitiesTableExists(sql);
  if (!exists) return new Map();

  const rows = await sql<UserActivityStatsRow[]>`
    SELECT
      user_id,
      COUNT(*)::int AS total_activities,
      COALESCE(
        SUM(COALESCE(llm_tokens_prompt, 0) + COALESCE(llm_tokens_completion, 0)),
        0
      ) AS total_tokens,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_attempts,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completions,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_attempts,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_completions,
      COUNT(*) FILTER (
        WHERE event_type IN (
          'payment_successful',
          'payment_failed',
          'subscription_created',
          'subscription_cancelled'
        )
      )::int AS payment_events,
      COUNT(*) FILTER (
        WHERE event_type IN ('dispute_created', 'dispute_resolved')
      )::int AS dispute_events,
      COUNT(DISTINCT NULLIF(TRIM(ip_address), '')) FILTER (
        WHERE ip_address IS NOT NULL AND TRIM(ip_address) <> ''
      )::int AS unique_ip_addresses_count,
      COUNT(DISTINCT NULLIF(TRIM(user_agent), '')) FILTER (
        WHERE user_agent IS NOT NULL AND TRIM(user_agent) <> ''
      )::int AS unique_user_agents_count,
      MAX(timestamp_utc) AS last_activity,
      MIN(timestamp_utc) AS first_activity,
      COALESCE(
        array_agg(DISTINCT NULLIF(TRIM(ip_address), '')) FILTER (
          WHERE ip_address IS NOT NULL AND TRIM(ip_address) <> ''
        ),
        ARRAY[]::text[]
      ) AS ip_addresses,
      COALESCE(
        array_agg(DISTINCT NULLIF(TRIM(user_agent), '')) FILTER (
          WHERE user_agent IS NOT NULL AND TRIM(user_agent) <> ''
        ),
        ARRAY[]::text[]
      ) AS user_agents
    FROM public.user_activities
    WHERE user_id = ANY(${uniqueIds})
    GROUP BY user_id
  `;

  const map = new Map<string, AdminUserActivityStats>();
  for (const row of rows) {
    map.set(row.user_id, rowToActivityStats(row));
  }
  return map;
}

/** Merge stats when activities may be stored under Clerk, Supabase, or legacy ids. */
export function mergeActivityStatsForCandidates(
  candidateIds: string[],
  statsByUserId: Map<string, AdminUserActivityStats>
): AdminUserActivityStats {
  const ids = uniqueNonEmptyIds(candidateIds);
  if (ids.length === 0) return { ...EMPTY_ACTIVITY_STATS };

  let totalActivities = 0;
  let totalTokens = 0;
  let practiceAttempts = 0;
  let practiceCompletions = 0;
  let mockAttempts = 0;
  let mockCompletions = 0;
  let paymentEvents = 0;
  let disputeEvents = 0;
  let lastActivity: Date | null = null;
  let firstActivity: Date | null = null;
  const ipSet = new Set<string>();
  const uaSet = new Set<string>();

  for (const id of ids) {
    const stats = statsByUserId.get(id);
    if (!stats) continue;

    totalActivities += stats.totalActivities;
    totalTokens += stats.totalTokens;
    practiceAttempts += stats.practiceAttempts;
    practiceCompletions += stats.practiceCompletions;
    mockAttempts += stats.mockAttempts;
    mockCompletions += stats.mockCompletions;
    paymentEvents += stats.paymentEvents;
    disputeEvents += stats.disputeEvents;

    if (stats.lastActivity) {
      if (!lastActivity || stats.lastActivity > lastActivity) {
        lastActivity = stats.lastActivity;
      }
    }
    if (stats.firstActivity) {
      if (!firstActivity || stats.firstActivity < firstActivity) {
        firstActivity = stats.firstActivity;
      }
    }
    for (const ip of stats.ipAddresses) ipSet.add(ip);
    for (const ua of stats.userAgents) uaSet.add(ua);
  }

  return {
    totalActivities,
    totalTokens,
    practiceAttempts,
    practiceCompletions,
    mockAttempts,
    mockCompletions,
    paymentEvents,
    disputeEvents,
    uniqueIpAddressesCount: ipSet.size,
    uniqueUserAgentsCount: uaSet.size,
    lastActivity,
    firstActivity,
    ipAddresses: [...ipSet],
    userAgents: [...uaSet],
  };
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
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
 * Activity metrics are loaded in a second batched query against `user_activities`.
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
    subFilter = sql`AND lower(trim(coalesce(p.plan, ''))) = 'plus'`;
  } else if (subscriptionStatus === "never") {
    subFilter = sql`AND lower(trim(coalesce(p.plan, ''))) IS DISTINCT FROM 'plus'
      AND (p.public_metadata->>'purchaseDate') IS NULL`;
  } else if (subscriptionStatus === "unsubscribed") {
    subFilter = sql`AND lower(trim(coalesce(p.plan, ''))) IS DISTINCT FROM 'plus'
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
      p.legacy_clerk_user_id,
      p.supabase_auth_user_id::text AS supabase_auth_user_id,
      p.id::text AS profile_id,
      p.app_document_mongo_id,
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

  const candidateIdsByStableId = dataRows.map((r) =>
    uniqueNonEmptyIds([
      r.stable_id,
      r.legacy_clerk_user_id,
      r.supabase_auth_user_id,
      r.profile_id,
      r.app_document_mongo_id,
    ])
  );
  const allCandidateIds = uniqueNonEmptyIds(candidateIdsByStableId.flat());
  const statsByUserId = await fetchActivityStatsByUserIds(sql, allCandidateIds);

  const rows = dataRows.map((r, index) => {
    const meta = asRecord(r.public_metadata);
    const planRaw = (r.plan ?? meta.plan ?? "free") as string;
    const plan = String(planRaw).toLowerCase() === "plus" ? "plus" : "free";
    const activity = mergeActivityStatsForCandidates(
      candidateIdsByStableId[index] ?? [],
      statsByUserId
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
 * Fallback: paginate `users` app_documents; activity metrics from `user_activities`.
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
    subFilter = sql`AND lower(trim(coalesce(d.body->>'plan', ''))) = 'plus'`;
  } else if (subscriptionStatus === "never") {
    subFilter = sql`AND lower(trim(coalesce(d.body->>'plan', ''))) IS DISTINCT FROM 'plus'
      AND (d.body#>>'{publicMetadata,purchaseDate}') IS NULL`;
  } else if (subscriptionStatus === "unsubscribed") {
    subFilter = sql`AND lower(trim(coalesce(d.body->>'plan', ''))) IS DISTINCT FROM 'plus'
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

  const candidateIdsByStableId = dataRows.map((r) => {
    const b = asRecord(r.body);
    const stable =
      (typeof b.supabaseUserId === "string" && b.supabaseUserId.trim()) ||
      (typeof b.sub === "string" && b.sub.trim()) ||
      (typeof b.clerkUserId === "string" && b.clerkUserId.trim()) ||
      r.mongo_id;
    return uniqueNonEmptyIds([
      stable,
      r.mongo_id,
      typeof b.supabaseUserId === "string" ? b.supabaseUserId : null,
      typeof b.sub === "string" ? b.sub : null,
      typeof b.clerkUserId === "string" ? b.clerkUserId : null,
    ]);
  });
  const allCandidateIds = uniqueNonEmptyIds(candidateIdsByStableId.flat());
  const statsByUserId = await fetchActivityStatsByUserIds(sql, allCandidateIds);

  const rows = dataRows.map((r, index) => {
    const b = asRecord(r.body);
    const meta = asRecord(b.publicMetadata);
    const stable =
      (typeof b.supabaseUserId === "string" && b.supabaseUserId.trim()) ||
      (typeof b.sub === "string" && b.sub.trim()) ||
      (typeof b.clerkUserId === "string" && b.clerkUserId.trim()) ||
      r.mongo_id;
    const planRaw = (b.plan ?? meta.plan ?? "free") as string;
    const plan = String(planRaw).toLowerCase() === "plus" ? "plus" : "free";
    const created =
      b.createdAt != null
        ? new Date(String(b.createdAt))
        : r.updated_at;
    const activity = mergeActivityStatsForCandidates(
      candidateIdsByStableId[index] ?? [],
      statsByUserId
    );
    return {
      _id: stable,
      email: (b.email as string | undefined) ?? null,
      firstName: b.firstName,
      lastName: b.lastName,
      lastActivity: activity.lastActivity ?? r.updated_at,
      firstActivity: activity.firstActivity ?? created,
      createdAt: created,
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

  return { rows, totalCount };
}
