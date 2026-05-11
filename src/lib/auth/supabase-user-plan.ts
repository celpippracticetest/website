import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

function readString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/** Stable Mongo / business key for accounts migrated from Clerk (`user_metadata.clerk_user_id`). */
export function readClerkLegacyUserIdFromSupabaseUser(
  user: Pick<SupabaseAuthUser, "user_metadata">
): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return (
    readString(meta, "clerk_user_id") ||
    readString(meta, "clerkUserId") ||
    null
  );
}

/** Middleware-safe plan hints (mirrors `mobileUserBridgeFromSupabaseUser` publicMetadata). */
export function readPracticePlanFromSupabaseUser(user: SupabaseAuthUser): {
  plan?: string;
  purchaseDate?: string;
} {
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const plan = (app.plan ?? meta.plan ?? "free") as string | undefined;
  const purchaseDate = (app.purchaseDate ?? meta.purchaseDate) as string | undefined;
  return { plan, purchaseDate };
}
