import { expireSupersededAuthCookiesOnResponse } from "@/lib/auth/expire-superseded-auth-cookies";
import { getSupabasePublicEnv } from "@/lib/supabase/public-env";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Establishes Supabase auth cookies on the server after client-side sign-in. */
export async function POST(request: NextRequest) {
  let body: { access_token?: string; refresh_token?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const access_token = body.access_token?.trim();
  const refresh_token = body.refresh_token?.trim();
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "missing_tokens" }, { status: 400 });
  }

  const env = getSupabasePublicEnv();
  if (!env) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true });
  const freshCookieNames = new Set<string>();

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        const fromRequest = request.cookies.getAll();
        if (fromRequest.length > 0) {
          return fromRequest;
        }
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          freshCookieNames.add(name);
          response.cookies.set(name, value, options);
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Response cookies are sufficient for the follow-up navigation.
          }
        }
      },
    },
  });

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // setSession can skip setAll when tokens match request cookies; getUser() forces writes.
  if (freshCookieNames.size === 0) {
    await supabase.auth.getUser();
  }

  expireSupersededAuthCookiesOnResponse(request, response, freshCookieNames);
  return response;
}
