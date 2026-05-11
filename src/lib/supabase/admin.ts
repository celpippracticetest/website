import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/** True when env has both project URL and service role key (required for `auth.getUser(jwt)` on the server). */
export function isSupabaseAdminConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && serviceRoleKey);
}

/**
 * Service-role Supabase client for server-side auth validation and admin updates.
 * Returns null when URL or service role key is not configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) {
    return cached;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    cached = null;
    return null;
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
