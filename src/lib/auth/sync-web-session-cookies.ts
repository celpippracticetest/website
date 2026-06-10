"use client";

import type { Session } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

export type WebSessionTokens = Pick<Session, "access_token" | "refresh_token">;

async function postSessionTokens(tokens: WebSessionTokens): Promise<boolean> {
  try {
    const res = await fetch("/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }),
    });
    if (!res.ok) {
      if (process.env.NODE_ENV === "development") {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        console.warn(
          "[syncWebSessionCookies] /auth/confirm failed:",
          res.status,
          body.error ?? body,
        );
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error("[syncWebSessionCookies] failed:", err);
    return false;
  }
}

async function resolveSessionTokens(
  sessionHint?: WebSessionTokens | null,
): Promise<WebSessionTokens | null> {
  if (sessionHint?.access_token && sessionHint.refresh_token) {
    return sessionHint;
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[syncWebSessionCookies] Supabase client not configured");
    }
    return null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData.session;
  if (session?.access_token && session.refresh_token) {
    return session;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[syncWebSessionCookies] no session tokens:", userError?.message ?? "no user");
    }
    return null;
  }

  const { data: retrySession } = await supabase.auth.getSession();
  session = retrySession.session;
  if (session?.access_token && session.refresh_token) {
    return session;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[syncWebSessionCookies] could not resolve tokens after getUser:",
      "missing refresh_token in browser session",
    );
  }
  return null;
}

/**
 * Writes the browser Supabase session into server-readable auth cookies before
 * a full-page navigation. Client-only cookie writes are not always visible to RSC.
 */
export async function syncWebSessionCookies(
  sessionHint?: WebSessionTokens | null,
): Promise<boolean> {
  const tokens = await resolveSessionTokens(sessionHint);
  if (!tokens) return false;
  return postSessionTokens(tokens);
}
