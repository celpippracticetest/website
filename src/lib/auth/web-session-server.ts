import "server-only";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { getSupabaseAuthUserFromServerCookies } from "@/lib/supabase/server-app-read-user";

/** Next throws this during static prerender when `auth()` / `cookies()` need a real request. */
function isDynamicServerUsage(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

/** True if the visitor has either a Clerk session or Supabase Auth cookies. */
export async function hasAnyWebSession(): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (userId) {
      return true;
    }
  } catch (err) {
    if (isDynamicServerUsage(err)) throw err;
    console.error("[hasAnyWebSession] Clerk auth() failed:", err);
  }
  try {
    const supabaseUser = await getSupabaseAuthUserFromServerCookies();
    return Boolean(supabaseUser);
  } catch (err) {
    if (isDynamicServerUsage(err)) throw err;
    console.error("[hasAnyWebSession] Supabase session read failed:", err);
    return false;
  }
}

/**
 * True when the visitor has Supabase Auth cookies (this site’s email/password session).
 * Ignores Clerk-only sessions so `/sign-in` stays usable during Clerk → Supabase overlap.
 */
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

/** Unified auth for dashboard server layout (Clerk session or Supabase cookies). */
export async function getDashboardLayoutAuthContext() {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  return getAuthenticatedRequestContext(
    new Request("http://localhost", { headers: { cookie } }),
  );
}

/**
 * Drop-in replacement for Clerk's `currentUser()` that works for both Clerk and
 * Supabase Auth sessions. Returns a Clerk-shaped user (or MobileUserBridge) so that
 * existing code reading `user.publicMetadata.plan` etc. continues to work.
 */
export async function getHybridCurrentUser() {
  const ctx = await getDashboardLayoutAuthContext();
  if (!ctx) return null;
  return { user: ctx.user, userId: ctx.userId };
}