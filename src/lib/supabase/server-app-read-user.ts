import "server-only";

import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { getVerifiedSupabaseUserFromClient } from "@/lib/supabase/auth-from-claims";

/**
 * Reads the current Supabase Auth user from cookies in a Server Component / RSC.
 * May refresh the session (writes cookies via Next.js cookie store).
 *
 * Wrapped in React `cache()` so a single navigation only validates the session once
 * when both the root layout and nested layouts/pages read the session.
 */
async function getSupabaseAuthUserFromServerCookiesUncached(): Promise<SupabaseAuthUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component that cannot mutate cookies — ignore.
        }
      },
    },
  });

  return getVerifiedSupabaseUserFromClient(supabase);
}

export const getSupabaseAuthUserFromServerCookies = cache(
  getSupabaseAuthUserFromServerCookiesUncached,
);
