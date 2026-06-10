import { syncWebSessionCookies } from "@/lib/auth/sync-web-session-cookies";

/** Full navigation after sign-in so Supabase cookies and RSC stay in sync. */
export async function navigateAfterWebAuth(dest: string): Promise<void> {
  if (typeof window === "undefined") return;
  await syncWebSessionCookies();
  window.location.assign(dest);
}
