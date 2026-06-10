import { getSupabasePublicEnv } from "@/lib/supabase/public-env";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export type SupabaseMiddlewareCookieWrite = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Resolves and refreshes the Supabase session from request cookies.
 * Must call `getUser()` (not only `getClaims()`) so token refresh writes updated cookies
 * onto the outgoing middleware response.
 */
export async function refreshSupabaseSessionFromRequest(
  request: NextRequest
): Promise<{
  user: SupabaseAuthUser | null;
  cookieWrites: SupabaseMiddlewareCookieWrite[];
}> {
  const env = getSupabasePublicEnv();
  if (!env) {
    return { user: null, cookieWrites: [] };
  }
  const { url, anonKey } = env;

  const cookieWrites: SupabaseMiddlewareCookieWrite[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          cookieWrites.push({ name, value, options });
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { user: null, cookieWrites };
  }

  return { user: data.user, cookieWrites };
}
