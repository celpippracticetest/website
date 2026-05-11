import {
  auth,
  clerkClient,
  currentUser,
  verifyToken,
} from "@clerk/nextjs/server";

import {
  mobileUserBridgeFromSupabaseUser,
  type MobileUserBridge,
} from "@/lib/auth/supabase-mobile-user-bridge";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseAuthUserFromRequestCookies } from "@/lib/supabase/server-request-client";

type RequestLike = Request & {
  headers: Headers;
};

type ClerkUserNonNull = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export interface AuthenticatedRequestContext {
  userId: string;
  /** Clerk user, or Clerk-shaped bridge for Supabase Auth (mobile bearer, web cookies). */
  user: ClerkUserNonNull | MobileUserBridge;
  source: "web" | "mobile";
  /** Present for bearer-token mobile requests: Clerk JWT vs Supabase access token. */
  mobileAuthKind: "clerk" | "supabase" | null;
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

  // Avoid naive `split(" ")` — multiple spaces after "Bearer" can yield an empty segment.
  const match = header.match(/^\s*Bearer\s+(\S+)\s*$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

/** Exposed for routes that need bearer diagnostics without duplicating header parsing. */
export function readBearerTokenFromRequest(request: RequestLike): string | null {
  return getBearerToken(request);
}

function getAuthorizedParties(): string[] | undefined {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES?.trim();
  if (!raw) {
    return undefined;
  }

  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : undefined;
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
    sessionId: null,
    tokenPayload: undefined,
  };
}

async function resolveMobileUserFromClerkBearer(
  _request: RequestLike,
  token: string
): Promise<AuthenticatedRequestContext | null> {
  try {
    const verifiedToken = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
      authorizedParties: getAuthorizedParties(),
    });

    const userId = verifiedToken?.sub;
    if (!userId) {
      return null;
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    return {
      userId,
      user,
      source: "mobile",
      mobileAuthKind: "clerk",
      sessionId:
        typeof (verifiedToken as Record<string, unknown>)?.sid === "string"
          ? ((verifiedToken as Record<string, unknown>).sid as string)
          : null,
      tokenPayload: verifiedToken as Record<string, unknown>,
    };
  } catch {
    // Common when the mobile app sends a Supabase access token after Supabase validation failed.
    return null;
  }
}

async function resolveMobileUserFromBearerToken(
  request: RequestLike
): Promise<AuthenticatedRequestContext | null> {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const supabaseCtx = await resolveMobileUserFromSupabaseBearer(request, token);
  if (supabaseCtx) {
    return supabaseCtx;
  }

  return await resolveMobileUserFromClerkBearer(request, token);
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
    sessionId: null,
    tokenPayload: undefined,
  };
}

/**
 * Auth resolution order:
 * 1. `Authorization: Bearer` — mobile (Supabase token first, then Clerk JWT)
 * 2. Supabase session cookies — primary web sign-in
 * 3. Clerk session — legacy web (`/sign-in/clerk`)
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

  const authResult = await auth();
  if (authResult.userId) {
    const user = await currentUser();
    if (!user) {
      return null;
    }

    return {
      userId: authResult.userId,
      user,
      source: "web",
      mobileAuthKind: null,
      sessionId: authResult.sessionId,
      sessionClaims: authResult.sessionClaims,
    };
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
