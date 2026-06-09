import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { getVerifiedSupabaseUserFromClient } from "@/lib/supabase/auth-from-claims";

export type SupabaseMiddlewareCookieWrite = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Resolves the Supabase session from request cookies via verified JWT claims.
 * Uses `getClaims()` (local JWKS verify) instead of `getUser()` (Auth API per call).
 */
export async function refreshSupabaseSessionFromRequest(
  request: NextRequest
): Promise<{
  user: SupabaseAuthUser | null;
  cookieWrites: SupabaseMiddlewareCookieWrite[];
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return { user: null, cookieWrites: [] };
  }

  const cookieWrites: SupabaseMiddlewareCookieWrite[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          cookieWrites.push({ name, value, options });
        }
      },
    },
  });

  const user = await getVerifiedSupabaseUserFromClient(supabase);
  if (!user) {
    return { user: null, cookieWrites };
  }

  return { user, cookieWrites };
}
