import "server-only";

import type { Sql } from "postgres";
import { rowToDocument } from "@/lib/pg/document";
import { resolveAppDocumentsPartitionKey } from "@/lib/pg/pgCollection";
import { getSql } from "@/lib/pg/pool";

export type ActivitySummary = {
  activityCount: number;
  firstActivityAt?: Date;
  lastActivityAt?: Date;
};

export type AuthUserRow = {
  user_id: string;
  signup_at: Date;
  is_subscribed: boolean;
};

type ListAuthUsersOpts = {
  minSignupAt: Date;
  limit: number;
  /** When true, exclude plan = plus. When false, include all users. */
  freeOnly: boolean;
};

export async function listRecentAuthUsers(opts: ListAuthUsersOpts): Promise<AuthUserRow[]> {
  const sql = getSql();
  try {
    return await listRecentAuthUsersFromAuthSchema(sql, opts);
  } catch (error) {
    console.warn(
      "[email-cron] auth.users query failed; falling back to user_profiles:",
      error instanceof Error ? error.message : error
    );
    return listRecentAuthUsersFromProfiles(sql, opts);
  }
}

async function listRecentAuthUsersFromAuthSchema(
  sql: Sql,
  opts: ListAuthUsersOpts
): Promise<AuthUserRow[]> {
  if (opts.freeOnly) {
    return sql<AuthUserRow[]>`
      SELECT
        u.id::text AS user_id,
        u.created_at AS signup_at,
        false AS is_subscribed
      FROM auth.users u
      LEFT JOIN public.user_profiles p ON p.supabase_auth_user_id = u.id
      WHERE u.deleted_at IS NULL
        AND u.created_at >= ${opts.minSignupAt}
        AND lower(trim(coalesce(
          u.raw_app_meta_data->>'plan',
          p.plan,
          ''
        ))) IS DISTINCT FROM 'plus'
      ORDER BY u.created_at DESC
      LIMIT ${opts.limit}
    `;
  }

  return sql<AuthUserRow[]>`
    SELECT
      u.id::text AS user_id,
      u.created_at AS signup_at,
      (lower(trim(coalesce(
        u.raw_app_meta_data->>'plan',
        p.plan,
        ''
      ))) = 'plus') AS is_subscribed
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.supabase_auth_user_id = u.id
    WHERE u.deleted_at IS NULL
      AND u.created_at >= ${opts.minSignupAt}
    ORDER BY u.created_at DESC
    LIMIT ${opts.limit}
  `;
}

async function listRecentAuthUsersFromProfiles(
  sql: Sql,
  opts: ListAuthUsersOpts
): Promise<AuthUserRow[]> {
  if (opts.freeOnly) {
    return sql<AuthUserRow[]>`
      SELECT
        COALESCE(
          supabase_auth_user_id::text,
          NULLIF(trim(legacy_clerk_user_id), '')
        ) AS user_id,
        created_at AS signup_at,
        false AS is_subscribed
      FROM public.user_profiles
      WHERE created_at >= ${opts.minSignupAt}
        AND COALESCE(lower(trim(plan)), '') IS DISTINCT FROM 'plus'
        AND (
          supabase_auth_user_id IS NOT NULL
          OR (legacy_clerk_user_id IS NOT NULL AND trim(legacy_clerk_user_id) <> '')
        )
      ORDER BY created_at DESC
      LIMIT ${opts.limit}
    `;
  }

  return sql<AuthUserRow[]>`
    SELECT
      COALESCE(
        supabase_auth_user_id::text,
        NULLIF(trim(legacy_clerk_user_id), '')
      ) AS user_id,
      created_at AS signup_at,
      (COALESCE(lower(trim(plan)), '') = 'plus') AS is_subscribed
    FROM public.user_profiles
    WHERE created_at >= ${opts.minSignupAt}
      AND (
        supabase_auth_user_id IS NOT NULL
        OR (legacy_clerk_user_id IS NOT NULL AND trim(legacy_clerk_user_id) <> '')
      )
    ORDER BY created_at DESC
    LIMIT ${opts.limit}
  `;
}

export function filterValidUserRows(rows: AuthUserRow[]): AuthUserRow[] {
  return rows.filter((row) => typeof row.user_id === "string" && row.user_id.trim() !== "");
}

export async function loadActivitySummariesByUserIds(
  userIds: string[]
): Promise<Map<string, ActivitySummary>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      activity_count: number;
      first_activity_at: Date | null;
      last_activity_at: Date | null;
    }[]
  >`
    SELECT
      user_id,
      COUNT(*)::int AS activity_count,
      MIN(timestamp_utc) AS first_activity_at,
      MAX(timestamp_utc) AS last_activity_at
    FROM public.user_activities
    WHERE user_id = ANY(${userIds})
    GROUP BY user_id
  `;

  const map = new Map<string, ActivitySummary>();
  for (const row of rows) {
    map.set(row.user_id, {
      activityCount: row.activity_count,
      firstActivityAt: row.first_activity_at ?? undefined,
      lastActivityAt: row.last_activity_at ?? undefined,
    });
  }
  return map;
}

/** Loads app_documents rows by `body.userId` without scanning the full partition. */
export async function loadAppDocumentsByUserIds<T extends { userId?: string }>(
  collectionLogicalKey: string,
  userIds: string[]
): Promise<Map<string, T>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const sql = getSql();
  const physKey = await resolveAppDocumentsPartitionKey(sql, collectionLogicalKey);
  const rows = await sql<{ body: unknown }[]>`
    SELECT body
    FROM app_documents
    WHERE collection = ${physKey}
      AND body->>'userId' = ANY(${userIds})
  `;

  const map = new Map<string, T>();
  for (const row of rows) {
    const doc = rowToDocument("", row.body) as T;
    if (typeof doc.userId === "string" && doc.userId.trim() !== "") {
      map.set(doc.userId, doc);
    }
  }
  return map;
}
