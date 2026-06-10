"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

/**
 * Writes the browser Supabase session into server-readable auth cookies before
 * a full-page navigation. Client-only cookie writes are not always visible to RSC.
 */
export async function syncWebSessionCookies(): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token || !session.refresh_token) return false;

  try {
    const res = await fetch("/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[syncWebSessionCookies] failed:", err);
    return false;
  }
}
