import type { Session } from "@supabase/supabase-js";
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
  window.location.assign(dest);
}
