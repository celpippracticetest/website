import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export type SupabaseMiddlewareCookieWrite = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Refreshes the Supabase auth session from request cookies and collects Set-Cookie
 * writes so middleware can apply them to the outgoing response.
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
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
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
