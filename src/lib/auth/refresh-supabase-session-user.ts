"use client";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

/**
 * Reloads the Supabase session JWT so `app_metadata.plan` matches the server
 * after Stripe webhooks update entitlements.
 */
export async function refreshSupabaseSessionUser(): Promise<SupabaseAuthUser | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;

  try {
    await supabase.auth.refreshSession();
  } catch {
    // Offline or blocked — still try getUser().
  }

  const { data: userData, error } = await supabase.auth.getUser();
  if (!error && userData.user) {
    return userData.user;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user ?? null;
}
