"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/public-env";

let browserClient: SupabaseClient | null | undefined;

/**
 * Single browser Supabase client per tab. Multiple instances each run
 * auto token refresh and can hit Auth rate limits (429).
 */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (browserClient) {
    return browserClient;
  }

  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  browserClient = createBrowserClient(env.url, env.anonKey, {
    auth: {
      // Middleware refreshes session cookies on navigation; avoid duplicate client refreshes (429).
      autoRefreshToken: false,
    },
  });
  return browserClient;
}
