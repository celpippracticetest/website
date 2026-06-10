import type { Session } from "@supabase/supabase-js";
import { seedSharedAuthUser } from "@/lib/auth/shared-web-auth";
import { syncWebSessionCookies, type WebSessionTokens } from "@/lib/auth/sync-web-session-cookies";

/** Full navigation after sign-in so Supabase cookies and RSC stay in sync. */
export async function navigateAfterWebAuth(
  dest: string,
  session?: WebSessionTokens | Session | null,
): Promise<void> {
  if (typeof window === "undefined") return;
  const synced = await syncWebSessionCookies(session);
  if (!synced) {
    console.warn("[navigateAfterWebAuth] server cookie sync failed; continuing with browser session");
  }

  const sessionUser =
    session && "user" in session && session.user ? session.user : null;
  if (sessionUser) {
    seedSharedAuthUser(sessionUser);
  }

  window.location.assign(dest);
}
