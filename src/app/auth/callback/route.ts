import { expireSupersededAuthCookiesOnResponse } from "@/lib/auth/expire-superseded-auth-cookies";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Handles Supabase Auth callbacks: Google OAuth (PKCE), magic links, and password recovery links. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  /** Where to send the user after a successful auth exchange. Must be same-origin. */
  const rawNext = searchParams.get("next") ?? "/practice-overview";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/practice-overview";
  const successUrl = new URL(next, origin);

  if (errorParam) {
    const msg = encodeURIComponent(errorDescription ?? errorParam);
    return NextResponse.redirect(`${origin}/sign-in?error=${msg}`);
  }

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!url || !anonKey) {
      return NextResponse.redirect(`${origin}/sign-in?error=supabase_not_configured`);
    }

    // Session cookies must be written onto the redirect response (not only `cookies()`).
    const response = NextResponse.redirect(successUrl);
    const freshCookieNames = new Set<string>();

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value, options } of cookiesToSet) {
            freshCookieNames.add(name);
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      expireSupersededAuthCookiesOnResponse(request, response, freshCookieNames);
      return response;
    }

    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
