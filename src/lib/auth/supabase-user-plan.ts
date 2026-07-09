import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

function readString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/**
 * Stable business id stored on imported accounts (`user_metadata` legacy keys).
 */
export function readLegacyImportedExternalUserId(
  user: Pick<SupabaseAuthUser, "user_metadata">
): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return (
    readString(meta, "clerk_user_id") ||
    readString(meta, "clerkUserId") ||
    null
  );
}

export function normalizePracticePlan(raw: unknown): string {
  if (typeof raw !== "string") return "free";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : "free";
}

/** Middleware-safe plan hints (mirrors `mobileUserBridgeFromSupabaseUser` publicMetadata). */
export function readPracticePlanFromSupabaseUser(user: SupabaseAuthUser): {
  plan?: string;
  purchaseDate?: string;
} {
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const plan = normalizePracticePlan(app.plan ?? meta.plan ?? "free");
  const purchaseDate = (app.purchaseDate ?? meta.purchaseDate) as string | undefined;
  return { plan, purchaseDate };
}
