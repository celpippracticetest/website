"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

/**
 * Single browser Supabase client per tab. Multiple instances each run
 * auto token refresh and can hit Auth rate limits (429).
 */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (browserClient !== undefined) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    browserClient = null;
    return null;
  }

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
