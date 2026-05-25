import "server-only";

import type { Sql } from "postgres";
import { getDb } from "@/lib/appDocumentsClient";
import { getSql } from "@/lib/pg/pool";
import { userProfilesTableExists } from "@/lib/admin/adminUsersDataSource";
import {
  FREE_USER_EMAIL_PREVIEW_LIMIT,
  FREE_USER_EMAIL_SEND_LIMIT,
  signupPeriodStart,
  type SignupPeriod,
} from "@/lib/admin/free-user-email-config";

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
  source: "user_profiles_sql" | "users_mongo";
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

async function listFromUserProfiles(
  sql: Sql,
  period: SignupPeriod,
  opts: { forSend?: boolean }
): Promise<FreeUserEmailAudienceResult> {
  const since = signupPeriodStart(period);
  const limit = opts.forSend ? FREE_USER_EMAIL_SEND_LIMIT : FREE_USER_EMAIL_PREVIEW_LIMIT;

  const countRows = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c
    FROM public.user_profiles p
    WHERE lower(trim(coalesce(p.plan, ''))) IS DISTINCT FROM 'plus'
      AND p.email IS NOT NULL
      AND trim(p.email) <> ''
      AND p.created_at >= ${since}
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
      COALESCE(p.legacy_clerk_user_id, p.supabase_auth_user_id::text, p.id::text) AS user_id,
      p.email,
      p.first_name,
      p.created_at
    FROM public.user_profiles p
    WHERE lower(trim(coalesce(p.plan, ''))) IS DISTINCT FROM 'plus'
      AND p.email IS NOT NULL
      AND trim(p.email) <> ''
      AND p.created_at >= ${since}
    ORDER BY p.created_at DESC
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
    source: "user_profiles_sql",
  };
}

async function listFromMongo(
  period: SignupPeriod,
  opts: { forSend?: boolean }
): Promise<FreeUserEmailAudienceResult> {
  const since = signupPeriodStart(period);
  const limit = opts.forSend ? FREE_USER_EMAIL_SEND_LIMIT : FREE_USER_EMAIL_PREVIEW_LIMIT;
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
  opts: { forSend?: boolean } = {}
): Promise<FreeUserEmailAudienceResult> {
  try {
    const sql = getSql();
    const hasProfiles = await userProfilesTableExists(sql);
    if (hasProfiles) {
      return listFromUserProfiles(sql, period, opts);
    }
  } catch (error) {
    console.warn(
      "[free-user-email-audience] SQL path unavailable; falling back to Mongo:",
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
