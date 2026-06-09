import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { normalizePlan } from "@/lib/subscriptionAccess";

function readString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/**
 * Stripe / checkout metadata can be present while `app_metadata.plan` was left at
 * `free` (webhook race or role bootstrap). Treat those accounts as paid for access.
 */
export function subscriptionMetadataIndicatesPaidPlan(
  app: Record<string, unknown>,
): boolean {
  const planType = readString(app, "planType");
  if (!planType) return false;
  if (readString(app, "purchaseDate")) return true;
  if (readString(app, "planRenewsAt")) return true;
  if (app.hasEverPurchased === true) return true;
  return false;
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

/** Middleware-safe plan hints (mirrors `mobileUserBridgeFromSupabaseUser` publicMetadata). */
export function readPracticePlanFromSupabaseUser(user: SupabaseAuthUser): {
  plan?: string;
  purchaseDate?: string;
} {
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  let plan = (app.plan ?? meta.plan ?? "free") as string | undefined;
  const purchaseDate = (app.purchaseDate ?? meta.purchaseDate) as string | undefined;
  if (normalizePlan(plan) !== "plus" && subscriptionMetadataIndicatesPaidPlan(app)) {
    plan = "plus";
  }
  return { plan, purchaseDate };
}
