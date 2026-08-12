import "server-only";

import type { Sql } from "postgres";
import { getSql } from "@/lib/pg/pool";
import { findUserProfileForAdminLookup } from "@/lib/users/userProfilesPg";

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
 * All `user_activities.user_id` values that may belong to one CMS user.
 * Activities were logged under Clerk ids historically and Supabase Auth UUIDs later.
 */
export async function resolveActivityUserIds(
  identifier: string,
  sqlClient?: Sql
): Promise<string[]> {
  const id = identifier.trim();
  if (!id) return [];

  const sql = sqlClient ?? getSql();
  const profile = await findUserProfileForAdminLookup(id);
  if (profile) {
    const legacySub =
      typeof profile.legacy_body?.sub === "string"
        ? profile.legacy_body.sub
        : null;
    return uniqueNonEmpty([
      id,
      profile.legacy_clerk_user_id,
      profile.supabase_auth_user_id,
      profile.id,
      legacySub,
    ]);
  }

  // Auth-only users (no user_profiles row yet) still may have activity under the auth id.
  const authRows = await sql<{ id: string }[]>`
    SELECT id::text AS id
    FROM auth.users
    WHERE id::text = ${id}
       OR lower(email) = lower(${id})
    LIMIT 1
  `;
  if (authRows[0]?.id) {
    return uniqueNonEmpty([id, authRows[0].id]);
  }

  return [id];
}
