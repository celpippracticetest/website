import "server-only";

import type { Sql } from "postgres";
import { resolveAppDocumentsPartitionKey } from "@/lib/pg/pgCollection";
import {
  hasPaidPracticeAccess,
  normalizePlan,
} from "@/lib/subscriptionAccess";
import {
  loadUserActivityMetricsByUserId,
} from "@/lib/userActivity/userActivitiesPg";
import { getLiveStripeActiveSubscriberKeys } from "@/lib/admin/liveStripeActiveSubscribers";

/** Keep paid plan tokens as stored; everything else → free for admin list. */
function normalizeAdminListPlan(planRaw: unknown): string {
  const plan = normalizePlan(typeof planRaw === "string" ? planRaw : null);
  if (!plan) return "free";
  if (hasPaidPracticeAccess(plan)) return plan;
  return "free";
}

const ADMIN_USERS_PAGE_SIZE_MAX = 50;

/** Default page size for admin user list (Supabase / SQL paginated paths). */
export function defaultAdminUsersPageLimit(): number {
  const raw = process.env.ADMIN_USERS_PAGE_SIZE?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) return Math.min(ADMIN_USERS_PAGE_SIZE_MAX, Math.floor(n));
  }
  return 20;
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
  profile_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  plan: string | null;
  plan_type: string | null;
  public_metadata: Record<string, unknown> | null;
  stripe_customer_id: string | null;
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
 * Page-scoped activity rollups from `public.user_activities`.
 */
async function loadActivityMetricsByUserId(
  sql: Sql,
  userIds: Array<string | null | undefined>
): Promise<Map<string, ActivityMetrics>> {
  return loadUserActivityMetricsByUserId(userIds, sql);
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

type AdminUsersSortMetricMode = "none" | "lastActivity";

/**
 * Default CMS sort is lastActivity. Joining/aggregating `user_activities`
 * (~1M rows) for every profile before LIMIT was taking ~100s+ via the pooler.
 * `user_activity_reminders.last_engaged_at` is maintained on engagement events
 * and is the cheap source of truth for list ordering; page rows still get full
 * activity metrics after LIMIT.
 */
function adminUsersSortMetricMode(sortBy: string): AdminUsersSortMetricMode {
  return sortBy === "lastActivity" ? "lastActivity" : "none";
}

function orderByCombinedSql(
  sortBy: string,
  sortOrder: "asc" | "desc",
  sortMetricMode: AdminUsersSortMetricMode
): string {
  const dir = sortOrder === "asc" ? "ASC" : "DESC";
  if (sortMetricMode === "lastActivity") {
    return `sort_last_activity ${dir} NULLS LAST, stable_id`;
  }

  switch (sortBy) {
    case "createdAt":
      return `created_at ${dir} NULLS LAST, stable_id`;
    case "plan":
      return `lower(trim(coalesce(plan, ''))) ${dir} NULLS LAST, stable_id`;
    case "totalSpend": {
      const spendExpr =
        "NULLIF(TRIM(COALESCE(public_metadata->>'totalSpend', '')), '')::numeric";
      return `${spendExpr} ${dir} NULLS LAST, stable_id`;
    }
    case "totalTokens":
    case "totalActivities":
    case "riskScore":
    case "lastActivity":
    default:
      // totalTokens / activity sorts approximate via profile updated_at to avoid
      // a full user_activities rollup (see adminUsersSortMetricMode).
      return `updated_at ${dir} NULLS LAST, stable_id`;
  }
}

/** Profiles + auth.users that never got a user_profiles row. */
const COMBINED_ADMIN_USERS_SQL = `
  SELECT
    COALESCE(
      NULLIF(TRIM(p.legacy_clerk_user_id), ''),
      NULLIF(TRIM(p.supabase_auth_user_id::text), ''),
      p.id::text
    ) AS stable_id,
    p.supabase_auth_user_id::text AS supabase_auth_user_id,
    p.legacy_clerk_user_id,
    p.id::text AS profile_id,
    COALESCE(NULLIF(TRIM(p.email), ''), au.email) AS email,
    COALESCE(
      NULLIF(TRIM(p.first_name), ''),
      NULLIF(
        TRIM(
          COALESCE(
            au.raw_user_meta_data->>'given_name',
            au.raw_user_meta_data->>'first_name',
            split_part(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''), ' ', 1)
          )
        ),
        ''
      )
    ) AS first_name,
    COALESCE(
      NULLIF(TRIM(p.last_name), ''),
      NULLIF(
        TRIM(
          COALESCE(
            au.raw_user_meta_data->>'family_name',
            au.raw_user_meta_data->>'last_name',
            NULLIF(
              CASE
                WHEN position(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')) > 0
                THEN substr(
                  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''),
                  position(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')) + 1
                )
                ELSE NULL
              END,
              ''
            )
          )
        ),
        ''
      )
    ) AS last_name,
    p.plan,
    p.plan_type,
    COALESCE(p.public_metadata, '{}'::jsonb) AS public_metadata,
    NULLIF(TRIM(p.stripe_customer_id), '') AS stripe_customer_id,
    COALESCE(au.created_at, p.created_at) AS created_at,
    COALESCE(p.updated_at, au.last_sign_in_at, au.created_at) AS updated_at
  FROM public.user_profiles p
  LEFT JOIN auth.users au ON au.id = p.supabase_auth_user_id

  UNION ALL

  SELECT
    au.id::text AS stable_id,
    au.id::text AS supabase_auth_user_id,
    NULL::text AS legacy_clerk_user_id,
    NULL::text AS profile_id,
    au.email,
    NULLIF(
      TRIM(
        COALESCE(
          au.raw_user_meta_data->>'given_name',
          au.raw_user_meta_data->>'first_name',
          split_part(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''), ' ', 1)
        )
      ),
      ''
    ) AS first_name,
    NULLIF(
      TRIM(
        COALESCE(
          au.raw_user_meta_data->>'family_name',
          au.raw_user_meta_data->>'last_name',
          NULLIF(
            CASE
              WHEN position(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')) > 0
              THEN substr(
                COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''),
                position(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')) + 1
              )
              ELSE NULL
            END,
            ''
          )
        )
      ),
      ''
    ) AS last_name,
    COALESCE(NULLIF(TRIM(au.raw_app_meta_data->>'plan'), ''), 'free') AS plan,
    NULLIF(TRIM(au.raw_app_meta_data->>'planType'), '') AS plan_type,
    COALESCE(au.raw_app_meta_data, '{}'::jsonb) AS public_metadata,
    NULLIF(TRIM(au.raw_app_meta_data->>'stripeCustomerId'), '') AS stripe_customer_id,
    au.created_at,
    COALESCE(au.last_sign_in_at, au.created_at) AS updated_at
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.supabase_auth_user_id = au.id
  )
`;

/**
 * Paginated admin user list from:
 * - `public.user_profiles` (legacy + enriched rows), plus
 * - `auth.users` with no matching profile (mobile / Google sign-ups that never got a profile row)
 *
 * Uses `LIMIT` / `OFFSET` — never loads the full table into the app server.
 * Activity / IP / token metrics are joined for the current page only.
 */
export async function listAdminUsersFromUserProfiles(
  sql: Sql,
  params: AdminUsersListParams
): Promise<{ rows: unknown[]; totalCount: number }> {
  const { search, page, limit, sortBy, sortOrder, subscriptionStatus } = params;
  const offset = (page - 1) * limit;
  const q = search.trim();
  const sortMetricMode = adminUsersSortMetricMode(sortBy);
  const order = orderByCombinedSql(sortBy, sortOrder, sortMetricMode);

  let subFilter = sql``;
  if (
    subscriptionStatus === "active" ||
    subscriptionStatus === "stripe_active" ||
    subscriptionStatus === "plans"
  ) {
    // Live Stripe active/trialing — matches Dashboard subscriber count.
    const keys = await getLiveStripeActiveSubscriberKeys();
    const customerIds = keys.customerIds;
    const userIds = keys.userIds;
    if (customerIds.length === 0 && userIds.length === 0) {
      subFilter = sql`AND FALSE`;
    } else {
      subFilter = sql`AND (
        (c.stripe_customer_id IS NOT NULL AND c.stripe_customer_id = ANY(${customerIds}))
        OR (c.supabase_auth_user_id IS NOT NULL AND c.supabase_auth_user_id = ANY(${userIds}))
        OR (NULLIF(TRIM(c.legacy_clerk_user_id), '') IS NOT NULL AND c.legacy_clerk_user_id = ANY(${userIds}))
        OR c.stable_id = ANY(${userIds})
      )`;
    }
  } else if (subscriptionStatus === "app_paid") {
    // App entitlement paid (comps, PayPal, stale plus, etc.) — not Stripe Dashboard.
    subFilter = sql`AND lower(trim(coalesce(c.plan, ''))) IN ('plus', 'premium', 'pro', 'enterprise')
      AND coalesce(c.public_metadata->>'planCancelled', 'false') <> 'true'`;
  } else if (subscriptionStatus === "never" || subscriptionStatus === "free") {
    subFilter = sql`AND lower(trim(coalesce(c.plan, ''))) NOT IN ('plus', 'premium', 'pro', 'enterprise')
      AND (c.public_metadata->>'purchaseDate') IS NULL
      AND coalesce(c.public_metadata->>'planCancelled', 'false') <> 'true'`;
  } else if (
    subscriptionStatus === "canceled" ||
    subscriptionStatus === "cancelled" ||
    subscriptionStatus === "unsubscribed"
  ) {
    // Canceling (paid + planCancelled) or fully unsubscribed
    subFilter = sql`AND (
      (
        lower(trim(coalesce(c.plan, ''))) IN ('plus', 'premium', 'pro', 'enterprise')
        AND coalesce(c.public_metadata->>'planCancelled', 'false') = 'true'
      )
      OR (
        lower(trim(coalesce(c.plan, ''))) NOT IN ('plus', 'premium', 'pro', 'enterprise')
        AND (
          (c.public_metadata->>'purchaseDate') IS NOT NULL
          OR coalesce(c.public_metadata->>'planCancelled', 'false') = 'true'
          OR NULLIF(TRIM(COALESCE(c.public_metadata->>'totalSpend', '')), '') IS NOT NULL
        )
      )
    )`;
  }

  let searchFilter = sql``;
  if (q.length > 0) {
    const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    searchFilter = sql`AND (
      c.email ILIKE ${like}
      OR c.stable_id ILIKE ${like}
      OR COALESCE(c.legacy_clerk_user_id, '') ILIKE ${like}
      OR COALESCE(c.supabase_auth_user_id, '') ILIKE ${like}
      OR COALESCE(c.first_name, '') ILIKE ${like}
      OR COALESCE(c.last_name, '') ILIKE ${like}
    )`;
  }

  // Multiple user_profiles can share the same legacy_clerk_user_id (or otherwise
  // collapse to one stable_id). Dedupe before count/pagination so React keys stay unique.
  const countRows = await sql<{ c: number }[]>`
    WITH combined AS (
      ${sql.unsafe(COMBINED_ADMIN_USERS_SQL)}
    ),
    filtered AS (
      SELECT c.*
      FROM combined c
      WHERE 1 = 1
      ${subFilter}
      ${searchFilter}
    ),
    deduped AS (
      SELECT DISTINCT ON (stable_id)
        stable_id
      FROM filtered
      ORDER BY
        stable_id,
        (supabase_auth_user_id IS NOT NULL) DESC,
        updated_at DESC NULLS LAST
    )
    SELECT COUNT(*)::int AS c
    FROM deduped
  `;
  const totalCount = countRows[0]?.c ?? 0;

  const dataRows =
    sortMetricMode === "lastActivity"
      ? await sql<ProfileListRow[]>`
          WITH combined AS (
            ${sql.unsafe(COMBINED_ADMIN_USERS_SQL)}
          ),
          filtered AS (
            SELECT
              c.stable_id,
              c.supabase_auth_user_id,
              c.legacy_clerk_user_id,
              c.profile_id,
              c.email,
              c.first_name,
              c.last_name,
              c.plan,
              c.plan_type,
              c.public_metadata,
              c.stripe_customer_id,
              c.created_at,
              c.updated_at
            FROM combined c
            WHERE 1 = 1
            ${subFilter}
            ${searchFilter}
          ),
          deduped AS (
            SELECT DISTINCT ON (stable_id)
              stable_id,
              supabase_auth_user_id,
              legacy_clerk_user_id,
              profile_id,
              email,
              first_name,
              last_name,
              plan,
              plan_type,
              public_metadata,
              stripe_customer_id,
              created_at,
              updated_at
            FROM filtered
            ORDER BY
              stable_id,
              (supabase_auth_user_id IS NOT NULL) DESC,
              updated_at DESC NULLS LAST
          )
          SELECT
            f.stable_id,
            f.supabase_auth_user_id,
            f.legacy_clerk_user_id,
            f.profile_id,
            f.email,
            f.first_name,
            f.last_name,
            f.plan,
            f.plan_type,
            f.public_metadata,
            f.stripe_customer_id,
            f.created_at,
            f.updated_at,
            (
              SELECT MAX(r.last_engaged_at)
              FROM public.user_activity_reminders r
              WHERE r.user_id = f.stable_id
                 OR (
                   f.supabase_auth_user_id IS NOT NULL
                   AND r.user_id = f.supabase_auth_user_id
                 )
                 OR (
                   NULLIF(TRIM(f.legacy_clerk_user_id), '') IS NOT NULL
                   AND r.user_id = f.legacy_clerk_user_id
                 )
                 OR (
                   f.profile_id IS NOT NULL
                   AND r.user_id = f.profile_id
                 )
            ) AS sort_last_activity
          FROM deduped f
          ORDER BY ${sql.unsafe(order)}
          LIMIT ${limit}
          OFFSET ${offset}
        `
      : await sql<ProfileListRow[]>`
          WITH combined AS (
            ${sql.unsafe(COMBINED_ADMIN_USERS_SQL)}
          ),
          filtered AS (
            SELECT
              c.stable_id,
              c.supabase_auth_user_id,
              c.legacy_clerk_user_id,
              c.profile_id,
              c.email,
              c.first_name,
              c.last_name,
              c.plan,
              c.plan_type,
              c.public_metadata,
              c.stripe_customer_id,
              c.created_at,
              c.updated_at
            FROM combined c
            WHERE 1 = 1
            ${subFilter}
            ${searchFilter}
          ),
          deduped AS (
            SELECT DISTINCT ON (stable_id)
              stable_id,
              supabase_auth_user_id,
              legacy_clerk_user_id,
              profile_id,
              email,
              first_name,
              last_name,
              plan,
              plan_type,
              public_metadata,
              stripe_customer_id,
              created_at,
              updated_at
            FROM filtered
            ORDER BY
              stable_id,
              (supabase_auth_user_id IS NOT NULL) DESC,
              updated_at DESC NULLS LAST
          )
          SELECT
            f.stable_id,
            f.supabase_auth_user_id,
            f.legacy_clerk_user_id,
            f.profile_id,
            f.email,
            f.first_name,
            f.last_name,
            f.plan,
            f.plan_type,
            f.public_metadata,
            f.stripe_customer_id,
            f.created_at,
            f.updated_at
          FROM deduped f
          ORDER BY ${sql.unsafe(order)}
          LIMIT ${limit}
          OFFSET ${offset}
        `;
  const activityIdCandidates = dataRows.flatMap((r) => [
    r.stable_id,
    r.supabase_auth_user_id,
    r.legacy_clerk_user_id,
    r.profile_id,
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
      [r.stable_id, r.supabase_auth_user_id, r.legacy_clerk_user_id, r.profile_id],
      activityByUserId
    );
    const stripeActiveFilter =
      subscriptionStatus === "active" ||
      subscriptionStatus === "stripe_active" ||
      subscriptionStatus === "plans";
    return {
      _id: r.stable_id,
      email: r.email ?? null,
      firstName: r.first_name,
      lastName: r.last_name,
      lastActivity: activity.lastActivity,
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
      planExpiresAt: meta.planExpiresAt ?? null,
      publicMetadataPlanExpiresAt: meta.planExpiresAt ?? null,
      publicMetadataPurchaseDate: meta.purchaseDate ?? null,
      stripeCustomerId: r.stripe_customer_id ?? null,
      stripeSubscriptionActive: stripeActiveFilter,
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
    case "totalTokens":
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
  if (
    subscriptionStatus === "active" ||
    subscriptionStatus === "stripe_active" ||
    subscriptionStatus === "plans"
  ) {
    const keys = await getLiveStripeActiveSubscriberKeys();
    const customerIds = keys.customerIds;
    const userIds = keys.userIds;
    if (customerIds.length === 0 && userIds.length === 0) {
      subFilter = sql`AND FALSE`;
    } else {
      subFilter = sql`AND (
        NULLIF(TRIM(COALESCE(d.body->>'stripeCustomerId', d.body#>>'{privateMetadata,stripeCustomerId}', '')), '') = ANY(${customerIds})
        OR d.mongo_id = ANY(${userIds})
        OR NULLIF(TRIM(COALESCE(d.body->>'supabaseUserId', '')), '') = ANY(${userIds})
        OR NULLIF(TRIM(COALESCE(d.body->>'clerkUserId', '')), '') = ANY(${userIds})
        OR NULLIF(TRIM(COALESCE(d.body->>'sub', '')), '') = ANY(${userIds})
      )`;
    }
  } else if (subscriptionStatus === "app_paid") {
    subFilter = sql`AND lower(trim(coalesce(d.body->>'plan', ''))) IN ('plus', 'premium', 'pro', 'enterprise')
      AND coalesce(d.body#>>'{publicMetadata,planCancelled}', 'false') <> 'true'`;
  } else if (subscriptionStatus === "never" || subscriptionStatus === "free") {
    subFilter = sql`AND lower(trim(coalesce(d.body->>'plan', ''))) NOT IN ('plus', 'premium', 'pro', 'enterprise')
      AND (d.body#>>'{publicMetadata,purchaseDate}') IS NULL
      AND coalesce(d.body#>>'{publicMetadata,planCancelled}', 'false') <> 'true'`;
  } else if (
    subscriptionStatus === "canceled" ||
    subscriptionStatus === "cancelled" ||
    subscriptionStatus === "unsubscribed"
  ) {
    subFilter = sql`AND (
      (
        lower(trim(coalesce(d.body->>'plan', ''))) IN ('plus', 'premium', 'pro', 'enterprise')
        AND coalesce(d.body#>>'{publicMetadata,planCancelled}', 'false') = 'true'
      )
      OR (
        lower(trim(coalesce(d.body->>'plan', ''))) NOT IN ('plus', 'premium', 'pro', 'enterprise')
        AND (
          (d.body#>>'{publicMetadata,purchaseDate}') IS NOT NULL
          OR coalesce(d.body#>>'{publicMetadata,planCancelled}', 'false') = 'true'
          OR NULLIF(TRIM(COALESCE(d.body#>>'{publicMetadata,totalSpend}', '')), '') IS NOT NULL
        )
      )
    )`;
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
      planExpiresAt: meta.planExpiresAt ?? null,
      publicMetadataPlanExpiresAt: meta.planExpiresAt ?? null,
      publicMetadataPurchaseDate: meta.purchaseDate ?? null,
      subscriptionStartDate: b.subscriptionStartDate ?? null,
      subscriptionEndDate: b.subscriptionEndDate ?? null,
      subscriptionDurationDays: b.subscriptionDurationDays ?? null,
      subscriptionHistory: [] as { type: string; date: unknown }[],
    };
  });

  // Collapse docs that resolve to the same canonical user id (e.g. clerk + supabase copies).
  const dedupedMapped = (() => {
    const byId = new Map<string, (typeof mapped)[number]>();
    for (const row of mapped) {
      const prev = byId.get(row._id);
      if (!prev) {
        byId.set(row._id, row);
        continue;
      }
      const prevTs = prev.lastActivity?.getTime?.() ?? 0;
      const nextTs = row.lastActivity?.getTime?.() ?? 0;
      if (nextTs >= prevTs) {
        byId.set(row._id, {
          ...row,
          activityIds: uniqueNonEmpty([...prev.activityIds, ...row.activityIds]),
        });
      } else {
        byId.set(row._id, {
          ...prev,
          activityIds: uniqueNonEmpty([...prev.activityIds, ...row.activityIds]),
        });
      }
    }
    return [...byId.values()];
  })();

  let activityByUserId = new Map<string, ActivityMetrics>();
  try {
    activityByUserId = await loadActivityMetricsByUserId(
      sql,
      dedupedMapped.flatMap((r) => r.activityIds)
    );
  } catch (e) {
    console.warn(
      "[admin/users] activity metrics join failed (users docs path); returning zeroed activity:",
      e instanceof Error ? e.message : e
    );
  }

  const rows = dedupedMapped.map(({ activityIds, ...r }) => {
    const activity = mergeActivityMetrics(activityIds, activityByUserId);
    return {
      ...r,
      lastActivity: activity.lastActivity,
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
