import "server-only";

import documentsClient from "@/lib/appDocumentsClient";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import {
  getCachedResolvedAuthUserId,
  setCachedResolvedAuthUserId,
} from "@/lib/auth/auth-admin-user-cache";
import {
  findUserProfileByWebUserId,
  supabaseAuthIdFromProfileRow,
} from "@/lib/users/userProfilesPg";

/**
 * Resolves the Supabase Auth UUID for a stable app user id (legacy Clerk id or Auth UUID).
 *
 * Does not call Auth Admin APIs — identity is resolved from UUID shape, `user_profiles`,
 * or the local users document. Callers that need a full Auth user should fetch once via
 * the cached admin helper.
 */
export async function resolveSupabaseAuthUserId(
  stableOrAuthId: string,
): Promise<string | null> {
  const id = stableOrAuthId.trim();
  if (!id) return null;

  const cached = getCachedResolvedAuthUserId(id);
  if (cached !== undefined) return cached;

  if (isLikelySupabaseAuthUserId(id)) {
    setCachedResolvedAuthUserId(id, id);
    return id;
  }

  const profile = await findUserProfileByWebUserId(id);
  if (profile) {
    const resolvedFromProfile = supabaseAuthIdFromProfileRow(profile);
    if (resolvedFromProfile) {
      setCachedResolvedAuthUserId(id, resolvedFromProfile);
      return resolvedFromProfile;
    }
  }

  const db = await documentsClient.db();
  const row = await db
    .collection("users")
    .findOne(
      { $or: [{ clerkUserId: id }, { supabaseUserId: id }, { sub: id }] },
      { projection: { supabaseUserId: 1 } },
    );
  const sid = row?.supabaseUserId as string | undefined;
  if (!sid) {
    setCachedResolvedAuthUserId(id, null);
    return null;
  }

  setCachedResolvedAuthUserId(id, sid);
  return sid;
}
