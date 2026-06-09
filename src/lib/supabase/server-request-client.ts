import "server-only";

import { createServerClient } from "@supabase/ssr";
import { getVerifiedSupabaseUserFromClient } from "@/lib/supabase/auth-from-claims";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { parse } from "cookie";

/**
 * Cookie pairs from a Request (NextRequest.cookies when available, else Cookie header).
 */
export function readRequestCookiePairs(request: Request): {
  name: string;
  value: string;
}[] {
  const extended = request as Request & {
    cookies?: { getAll: () => { name: string; value: string }[] };
  };

  if (typeof extended.cookies?.getAll === "function") {
    return extended.cookies.getAll();
  }

  const header = request.headers.get("cookie");
  if (!header?.trim()) {
    return [];
  }

  const parsed = parse(header);
  return Object.keys(parsed).map((name) => ({
    name,
    value: parsed[name] ?? "",
  }));
}

/**
 * Read-only Supabase server client from the incoming request cookies.
 * Does not refresh tokens or write Set-Cookie (use middleware or a dedicated handler for that).
 */
export function createSupabaseServerClientReadOnly(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return readRequestCookiePairs(request);
      },
      setAll() {
        // Intentionally no-op: auth context must not mutate cookies.
      },
    },
  });
}

export async function getSupabaseAuthUserFromRequestCookies(
  request: Request
): Promise<SupabaseAuthUser | null> {
  const supabase = createSupabaseServerClientReadOnly(request);
  if (!supabase) {
    return null;
  }

  return getVerifiedSupabaseUserFromClient(supabase);
}
