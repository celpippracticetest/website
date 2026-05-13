import {
  mobileUserBridgeFromSupabaseUser,
  type MobileUserBridge,
} from "@/lib/auth/supabase-mobile-user-bridge";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseAuthUserFromServerCookies } from "@/lib/supabase/server-app-read-user";
import { getSupabaseAuthUserFromRequestCookies } from "@/lib/supabase/server-request-client";

type RequestLike = Request & {
  headers: Headers;
};

export interface AuthenticatedRequestContext {
  /**
   * Stable account id for user documents: legacy Clerk id from migration metadata, else Supabase Auth UUID.
   */
  userId: string;
  user: MobileUserBridge;
  source: "web" | "mobile";
  /** Present for bearer-token mobile requests (Supabase access token). */
  mobileAuthKind: "supabase" | null;
  /** Supabase Auth user UUID for admin API calls. */
  supabaseAuthUserId: string | null;
  sessionId?: string | null;
  tokenPayload?: Record<string, unknown>;
  sessionClaims?: unknown;
}

let warnedSupabaseAdminMissing = false;

function getBearerToken(request: RequestLike): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const match = header.match(/^\s*Bearer\s+(\S+)\s*$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

/** Exposed for routes that need bearer diagnostics without duplicating header parsing. */
export function readBearerTokenFromRequest(request: RequestLike): string | null {
  return getBearerToken(request);
}

async function resolveMobileUserFromSupabaseBearer(
  _request: RequestLike,
  token: string
): Promise<AuthenticatedRequestContext | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    if (!warnedSupabaseAdminMissing) {
      warnedSupabaseAdminMissing = true;
      console.warn(
        "[auth] Supabase bearer auth unavailable: getSupabaseAdmin() is null. " +
          "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on this server " +
          "(same Supabase project as the mobile app). Mobile routes will return 401 until fixed.",
      );
    }
    return null;
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    if (process.env.NODE_ENV === "development" && error?.message) {
      console.warn(
        "[auth] Supabase admin.auth.getUser failed (bearer):",
        error.message,
      );
    }
    return null;
  }

  const user = mobileUserBridgeFromSupabaseUser(data.user);

  return {
    userId: user.id,
    user,
    source: "mobile",
    mobileAuthKind: "supabase",
    supabaseAuthUserId: user.supabaseAuthUserId ?? null,
    sessionId: null,
    tokenPayload: undefined,
  };
}

async function resolveMobileUserFromBearerToken(
  request: RequestLike
): Promise<AuthenticatedRequestContext | null> {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  return await resolveMobileUserFromSupabaseBearer(request, token);
}

async function resolveWebUserFromSupabaseCookies(
  request: RequestLike
): Promise<AuthenticatedRequestContext | null> {
  const supabaseUser = await getSupabaseAuthUserFromRequestCookies(request);
  if (!supabaseUser) {
    return null;
  }

  const user = mobileUserBridgeFromSupabaseUser(supabaseUser);

  return {
    userId: user.id,
    user,
    source: "web",
    mobileAuthKind: null,
    supabaseAuthUserId: user.supabaseAuthUserId ?? null,
    sessionId: null,
    tokenPayload: undefined,
  };
}

/**
 * Server Components / layouts only: resolve the signed-in web user using Next.js
 * `cookies()` for Supabase (deduped via React `cache()` in `getSupabaseAuthUserFromServerCookies`).
 */
export async function getAuthenticatedRscContext(): Promise<AuthenticatedRequestContext | null> {
  const supabaseUser = await getSupabaseAuthUserFromServerCookies();
  if (!supabaseUser) {
    return null;
  }
  const user = mobileUserBridgeFromSupabaseUser(supabaseUser);

  return {
    userId: user.id,
    user,
    source: "web",
    mobileAuthKind: null,
    supabaseAuthUserId: user.supabaseAuthUserId ?? null,
    sessionId: null,
    tokenPayload: undefined,
  };
}

/**
 * Auth resolution order:
 * 1. `Authorization: Bearer` — mobile (Supabase access token)
 * 2. Supabase session cookies — web sign-in
 */
export async function getAuthenticatedRequestContext(
  request: RequestLike
): Promise<AuthenticatedRequestContext | null> {
  let bearerCtx: AuthenticatedRequestContext | null = null;
  try {
    bearerCtx = await resolveMobileUserFromBearerToken(request);
  } catch (error) {
    console.error("Bearer token authentication failed", error);
  }
  if (bearerCtx) {
    return bearerCtx;
  }

  const supabaseWebCtx = await resolveWebUserFromSupabaseCookies(request);
  if (supabaseWebCtx) {
    return supabaseWebCtx;
  }

  return null;
}

export async function requireAuthenticatedRequest(
  request: RequestLike
): Promise<AuthenticatedRequestContext> {
  const context = await getAuthenticatedRequestContext(request);
  if (!context) {
    throw new Error("Unauthorized");
  }

  return context;
}
