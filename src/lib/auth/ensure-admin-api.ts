import { NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { sessionClaimsHasAdminRole } from "@/lib/auth/web-auth-session";

/**
 * Admin guard for Route Handlers. Prefer this over `currentUser()` + `auth()` so
 * Supabase session cookies are read from the incoming request, not RSC cache.
 */
export async function ensureAdminApi(request: Request) {
  const ctx = await getAuthenticatedRequestContext(request);
  if (!ctx) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const meta = (ctx.user as { publicMetadata?: Record<string, unknown> }).publicMetadata ?? {};
  if (!sessionClaimsHasAdminRole({ metadata: meta })) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, ctx };
}
