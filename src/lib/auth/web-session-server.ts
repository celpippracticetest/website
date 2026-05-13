import "server-only";

import { getSupabaseAuthUserFromServerCookies } from "@/lib/supabase/server-app-read-user";
import { getAuthenticatedRscContext } from "@/lib/auth/request-auth";

/** Next throws this during static prerender when `cookies()` need a real request. */
function isDynamicServerUsage(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

/** True if the visitor has a Supabase Auth session (web cookies). */
export async function hasAnyWebSession(): Promise<boolean> {
  try {
    const supabaseUser = await getSupabaseAuthUserFromServerCookies();
    return Boolean(supabaseUser);
  } catch (err) {
    if (isDynamicServerUsage(err)) throw err;
    console.error("[hasAnyWebSession] Supabase session read failed:", err);
    return false;
  }
}

/** True when the visitor has Supabase Auth cookies (email/password or OAuth session). */
export async function hasSupabaseWebSession(): Promise<boolean> {
  try {
    const supabaseUser = await getSupabaseAuthUserFromServerCookies();
    return Boolean(supabaseUser);
  } catch (err) {
    if (isDynamicServerUsage(err)) throw err;
    console.error("[hasSupabaseWebSession] Supabase session read failed:", err);
    return false;
  }
}

/** Unified auth for dashboard server layout (Supabase cookies). */
export async function getDashboardLayoutAuthContext() {
  return getAuthenticatedRscContext();
}

/**
 * Returns the signed-in user from Supabase Auth (Clerk-shaped bridge for legacy UI fields).
 */
export async function getHybridCurrentUser() {
  const ctx = await getDashboardLayoutAuthContext();
  if (!ctx) return null;
  return { user: ctx.user, userId: ctx.userId };
}
