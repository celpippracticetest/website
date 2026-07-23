import "server-only";

import { getSql } from "@/lib/pg/pool";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";

export type UserProfileRow = {
  id: string;
  supabase_auth_user_id: string | null;
  legacy_clerk_user_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  plan: string | null;
  plan_type: string | null;
  stripe_customer_id: string | null;
  public_metadata: Record<string, unknown>;
  legacy_body: Record<string, unknown>;
  app_document_mongo_id: string;
  created_at: Date;
  updated_at: Date;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * Returns Supabase Auth UUID string for this profile row, when known.
 */
export function supabaseAuthIdFromProfileRow(row: UserProfileRow): string | null {
  if (row.supabase_auth_user_id) return row.supabase_auth_user_id;
  const fromLegacy = row.legacy_body?.supabaseUserId;
  if (typeof fromLegacy === "string" && isLikelySupabaseAuthUserId(fromLegacy)) {
    return fromLegacy;
  }
  return null;
}

/**
 * Looks up `public.user_profiles` by any stable web id (Supabase UUID, legacy Clerk id, or JWT sub).
 */
export async function findUserProfileByWebUserId(
  stableOrAuthId: string,
): Promise<UserProfileRow | null> {
  const id = stableOrAuthId.trim();
  if (!id) return null;

  const sql = getSql();
  const rows = await sql<UserProfileRow[]>`
    SELECT
      id,
      supabase_auth_user_id,
      legacy_clerk_user_id,
      email,
      first_name,
      last_name,
      image_url,
      plan,
      plan_type,
      stripe_customer_id,
      public_metadata,
      legacy_body,
      app_document_mongo_id,
      created_at,
      updated_at
    FROM public.user_profiles
    WHERE legacy_clerk_user_id = ${id}
       OR (legacy_body ->> 'sub') = ${id}
       OR supabase_auth_user_id::text = ${id}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    public_metadata: asRecord(row.public_metadata),
    legacy_body: asRecord(row.legacy_body),
  };
}

/**
 * Admin CMS lookup: web user id, profile UUID, or email.
 */
export async function findUserProfileForAdminLookup(
  identifier: string,
): Promise<UserProfileRow | null> {
  const id = identifier.trim();
  if (!id) return null;

  const byWebId = await findUserProfileByWebUserId(id);
  if (byWebId) return byWebId;

  const sql = getSql();
  const rows = await sql<UserProfileRow[]>`
    SELECT
      id,
      supabase_auth_user_id,
      legacy_clerk_user_id,
      email,
      first_name,
      last_name,
      image_url,
      plan,
      plan_type,
      stripe_customer_id,
      public_metadata,
      legacy_body,
      app_document_mongo_id,
      created_at,
      updated_at
    FROM public.user_profiles
    WHERE id::text = ${id}
       OR lower(email) = lower(${id})
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    public_metadata: asRecord(row.public_metadata),
    legacy_body: asRecord(row.legacy_body),
  };
}
