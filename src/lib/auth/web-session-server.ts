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

/** Unified auth for dashboard server layout (Clerk session or Supabase cookies). */
export async function getDashboardLayoutAuthContext() {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  return getAuthenticatedRequestContext(
    new Request("http://localhost", { headers: { cookie } }),
  );
}