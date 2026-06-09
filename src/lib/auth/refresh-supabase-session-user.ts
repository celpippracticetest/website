"use client";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

const MIN_REFRESH_INTERVAL_MS = 60_000;

let refreshInFlight: Promise<SupabaseAuthUser | null> | null = null;
let lastRefreshAt = 0;

async function readSessionUser(): Promise<SupabaseAuthUser | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user ?? null;
}

export type RefreshSupabaseSessionOptions = {
  /** Bypass the 60s client-side throttle (e.g. after Stripe checkout). */
  force?: boolean;
};

/**
 * Reloads the Supabase session JWT so `app_metadata.plan` matches the server
 * after Stripe webhooks update entitlements. Throttled to avoid Auth 429s.
 */
export async function refreshSupabaseSessionUser(
  options?: RefreshSupabaseSessionOptions
): Promise<SupabaseAuthUser | null> {
  const force = options?.force === true;
  const now = Date.now();

  if (!force && refreshInFlight) {
    return refreshInFlight;
  }

  if (!force && now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) {
    return readSessionUser();
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;

  refreshInFlight = (async () => {
    try {
      await supabase.auth.refreshSession();
      lastRefreshAt = Date.now();
    } catch {
      // Offline, rate-limited, or blocked — still try to read the current user.
    }
    return readSessionUser();
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}
