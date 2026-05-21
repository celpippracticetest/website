import type { NextRequest, NextResponse } from "next/server";

/** Legacy Clerk session cookies (pre–Supabase Auth migration). */
function isLegacyClerkCookie(name: string): boolean {
  return name.startsWith("__");
}

/** Supabase Auth session chunks (`sb-<ref>-auth-token`, `.0`, `.1`, …). */
function isSupabaseAuthTokenCookie(name: string): boolean {
  return name.startsWith("sb-") && name.includes("auth-token");
}

/**
 * After a successful code exchange, drop orphaned auth cookie chunks still on the
 * request but not rewritten by `setAll` (common cause of 431 on localhost).
 */
export function expireSupersededAuthCookiesOnResponse(
  request: NextRequest,
  response: NextResponse,
  freshCookieNames: ReadonlySet<string>
): void {
  for (const cookie of request.cookies.getAll()) {
    const { name } = cookie;
    if (!isLegacyClerkCookie(name) && !isSupabaseAuthTokenCookie(name)) continue;
    if (freshCookieNames.has(name)) continue;

    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }
}
