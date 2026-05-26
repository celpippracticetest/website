import "server-only";

import type { Sql } from "postgres";
import { getDb } from "@/lib/appDocumentsClient";
import { getSql } from "@/lib/pg/pool";
import {
  FREE_USER_EMAIL_PREVIEW_LIMIT,
  FREE_USER_EMAIL_RESEND_SYNC_LIMIT,
  FREE_USER_EMAIL_SEND_LIMIT,
  signupPeriodStart,
  type SignupPeriod,
} from "@/lib/admin/free-user-email-config";

type AudienceListOpts = {
  forSend?: boolean;
  forResendSync?: boolean;
};

function resolveAudienceLimit(opts: AudienceListOpts): number {
  if (opts.forResendSync) return FREE_USER_EMAIL_RESEND_SYNC_LIMIT;
  if (opts.forSend) return FREE_USER_EMAIL_SEND_LIMIT;
  return FREE_USER_EMAIL_PREVIEW_LIMIT;
}

export type FreeUserEmailRecipient = {
  userId: string;
  email: string;
  firstName: string;
  signedUpAt: string;
};

export type FreeUserEmailAudienceResult = {
  period: SignupPeriod;
  totalCount: number;
  sample: FreeUserEmailRecipient[];
  source: "auth_users_sql" | "users_mongo";
};

function normalizeRecipient(row: {
  userId: string;
  email: string | null;
  firstName: string | null;
  signedUpAt: Date | string;
}): FreeUserEmailRecipient | null {
  const email = row.email?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) return null;
  const signedUpAt =
    row.signedUpAt instanceof Date
      ? row.signedUpAt.toISOString()
      : new Date(String(row.signedUpAt)).toISOString();
  return {
    userId: row.userId,
    email,
    firstName: row.firstName?.trim() || email.split("@")[0] || "there",
    signedUpAt,
  };
}

async function listFromAuthUsers(
  sql: Sql,
  period: SignupPeriod,
  opts: AudienceListOpts
): Promise<FreeUserEmailAudienceResult> {
  const since = signupPeriodStart(period);
  const limit = resolveAudienceLimit(opts);

  const countRows = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.supabase_auth_user_id = u.id
    WHERE u.email IS NOT NULL
      AND trim(u.email) <> ''
      AND u.deleted_at IS NULL
      AND u.created_at >= ${since}
      AND lower(trim(coalesce(
        u.raw_app_meta_data->>'plan',
        p.plan,
        ''
      ))) IS DISTINCT FROM 'plus'
  `;

  const rows = await sql<
    {
      user_id: string;
      email: string | null;
      first_name: string | null;
      created_at: Date;
    }[]
  >`
    SELECT
      u.id::text AS user_id,
      u.email,
      COALESCE(
        NULLIF(trim(u.raw_user_meta_data->>'first_name'), ''),
        NULLIF(trim(u.raw_user_meta_data->>'firstName'), ''),
        NULLIF(trim(u.raw_user_meta_data->>'given_name'), ''),
        NULLIF(trim(p.first_name), '')
      ) AS first_name,
      u.created_at
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.supabase_auth_user_id = u.id
    WHERE u.email IS NOT NULL
      AND trim(u.email) <> ''
      AND u.deleted_at IS NULL
      AND u.created_at >= ${since}
      AND lower(trim(coalesce(
        u.raw_app_meta_data->>'plan',
        p.plan,
        ''
      ))) IS DISTINCT FROM 'plus'
    ORDER BY u.created_at DESC
    LIMIT ${limit}
  `;

  const sample = rows
    .map((r) =>
      normalizeRecipient({
        userId: r.user_id,
        email: r.email,
        firstName: r.first_name,
        signedUpAt: r.created_at,
      })
    )
    .filter((r): r is FreeUserEmailRecipient => r !== null);

  return {
    period,
    totalCount: countRows[0]?.c ?? 0,
    sample,
    source: "auth_users_sql",
  };
}

async function listFromMongo(
  period: SignupPeriod,
  opts: AudienceListOpts
): Promise<FreeUserEmailAudienceResult> {
  const since = signupPeriodStart(period);
  const limit = resolveAudienceLimit(opts);
  const db = await getDb();
  const usersCollection = db.collection("users");

  const match = {
    plan: { $ne: "plus" },
    email: { $type: "string", $regex: /@/ },
    createdAt: { $gte: since },
  };

  const [totalCount, rows] = await Promise.all([
    usersCollection.countDocuments(match),
    usersCollection
      .find(match)
      .project({
        _id: 0,
        userId: { $ifNull: ["$clerkUserId", { $toString: "$_id" }] },
        email: 1,
        firstName: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray(),
  ]);

  const sample = rows
    .map((r) =>
      normalizeRecipient({
        userId: String(r.userId ?? ""),
        email: typeof r.email === "string" ? r.email : null,
        firstName: typeof r.firstName === "string" ? r.firstName : null,
        signedUpAt: r.createdAt instanceof Date ? r.createdAt : new Date(String(r.createdAt)),
      })
    )
    .filter((r): r is FreeUserEmailRecipient => r !== null && Boolean(r.userId));

  return {
    period,
    totalCount,
    sample,
    source: "users_mongo",
  };
}

export async function getFreeUserEmailAudience(
  period: SignupPeriod,
  opts: AudienceListOpts = {}
): Promise<FreeUserEmailAudienceResult> {
  try {
    const sql = getSql();
    return await listFromAuthUsers(sql, period, opts);
  } catch (error) {
    console.warn(
      "[free-user-email-audience] auth.users SQL path unavailable; falling back to Mongo:",
      error instanceof Error ? error.message : error
    );
  }

  return listFromMongo(period, opts);
}

export async function listFreeUserEmailRecipientsForSend(
  period: SignupPeriod
): Promise<FreeUserEmailRecipient[]> {
  const result = await getFreeUserEmailAudience(period, { forSend: true });
  return result.sample;
}

export async function listFreeUserEmailRecipientsForResendSync(
  period: SignupPeriod
): Promise<FreeUserEmailRecipient[]> {
  const result = await getFreeUserEmailAudience(period, { forResendSync: true });
  return dedupeRecipientsByEmail(result.sample);
}

export function dedupeRecipientsByEmail(
  recipients: FreeUserEmailRecipient[]
): FreeUserEmailRecipient[] {
  const seen = new Set<string>();
  return recipients.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
}
