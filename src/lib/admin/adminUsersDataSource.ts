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
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  plan: string | null;
  plan_type: string | null;
  public_metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

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
 * Activity / IP metrics are not joined here (zeros in the mapped row).
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

  const rows = dataRows.map((r) => {
    const meta = asRecord(r.public_metadata);
    const plan = normalizeAdminListPlan(r.plan ?? meta.plan ?? "free");
    return {
      _id: r.stable_id,
      email: r.email ?? null,
      firstName: r.first_name,
      lastName: r.last_name,
      lastActivity: r.updated_at,
      firstActivity: r.created_at,
      createdAt: r.created_at,
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
      ipAddresses: [] as string[],
      userAgents: [] as string[],
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
 * Fallback: paginate `users` app_documents only (activity metrics zeroed).
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

  const rows = dataRows.map((r) => {
    const b = asRecord(r.body);
    const meta = asRecord(b.publicMetadata);
    const stable =
      (typeof b.supabaseUserId === "string" && b.supabaseUserId.trim()) ||
      (typeof b.sub === "string" && b.sub.trim()) ||
      (typeof b.clerkUserId === "string" && b.clerkUserId.trim()) ||
      r.mongo_id;
    const plan = normalizeAdminListPlan(b.plan ?? meta.plan ?? "free");
    const created =
      b.createdAt != null
        ? new Date(String(b.createdAt))
        : r.updated_at;
    return {
      _id: stable,
      email: (b.email as string | undefined) ?? null,
      firstName: b.firstName,
      lastName: b.lastName,
      lastActivity: r.updated_at,
      firstActivity: created,
      createdAt: created,
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
      ipAddresses: [] as string[],
      userAgents: [] as string[],
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
