import "server-only";

import documentsClient from "@/lib/appDocumentsClient";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import {
  findUserProfileByWebUserId,
  supabaseAuthIdFromProfileRow,
} from "@/lib/users/userProfilesPg";

/**
 * Resolves the Supabase Auth UUID for a stable app user id (legacy Clerk id or Auth UUID).
 */
export async function resolveSupabaseAuthUserId(
  stableOrAuthId: string,
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const id = stableOrAuthId.trim();
  if (!id) return null;

  if (isLikelySupabaseAuthUserId(id)) {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error || !data.user) return null;
    return data.user.id;
  }

  const profile = await findUserProfileByWebUserId(id);
  if (profile) {
    const resolvedFromProfile = supabaseAuthIdFromProfileRow(profile);
    if (resolvedFromProfile) {
      const { data, error } = await admin.auth.admin.getUserById(resolvedFromProfile);
      if (!error && data.user) return data.user.id;
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
  if (!sid) return null;

  const { data, error } = await admin.auth.admin.getUserById(sid);
  if (error || !data.user) return null;
  return data.user.id;
}
