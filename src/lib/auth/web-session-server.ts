import "server-only";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { getSupabaseAuthUserFromServerCookies } from "@/lib/supabase/server-app-read-user";

/** True if the visitor has either a Clerk session or Supabase Auth cookies. */
export async function hasAnyWebSession(): Promise<boolean> {
  const { userId } = await auth();
  if (userId) {
    return true;
  }
  const supabaseUser = await getSupabaseAuthUserFromServerCookies();
  return Boolean(supabaseUser);
}

/** Unified auth for dashboard server layout (Clerk session or Supabase cookies). */
export async function getDashboardLayoutAuthContext() {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  return getAuthenticatedRequestContext(
    new Request("http://localhost", { headers: { cookie } }),
  );
}