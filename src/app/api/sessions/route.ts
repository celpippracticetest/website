import { appUserAdmin } from "@/lib/auth/server-auth";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import { NextRequest, NextResponse } from "next/server";

function hasBearerAttempt(request: NextRequest): boolean {
  const h = request.headers.get("authorization");
  return Boolean(h?.toLowerCase().startsWith("bearer "));
}

/**
 * Lists Clerk sessions for the signed-in user (browser cookie session or mobile Bearer JWT).
 * Supabase Auth sessions are not listed here (no Clerk session list).
 */
export async function GET(request: NextRequest) {
  const authContext = await getAuthenticatedRequestContext(request);

  if (!authContext?.userId) {
    if (hasBearerAttempt(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json([]);
  }

  if (isLikelySupabaseAuthUserId(authContext.userId)) {
    return NextResponse.json([]);
  }

  const authAdmin = await appUserAdmin();
  const { data: sessions } = await authAdmin.sessions.getSessionList({
    userId: authContext.userId,
  });
  type SessionRow = { status?: string };
  const list = (sessions ?? []) as SessionRow[];
  const activeSessions = list.filter((s) => s.status === "active");
  return NextResponse.json(activeSessions);
}
