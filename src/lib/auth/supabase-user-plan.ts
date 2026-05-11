import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

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
