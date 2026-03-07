import {
  auth,
  clerkClient,
  currentUser,
  verifyToken,
} from "@clerk/nextjs/server";

type RequestLike = Request & {
  headers: Headers;
};

export interface AuthenticatedRequestContext {
  userId: string;
  user: Awaited<ReturnType<typeof currentUser>>;
  source: "web" | "mobile";
  tokenPayload?: Record<string, unknown>;
  sessionClaims?: unknown;
}

function getBearerToken(request: RequestLike): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim() || null;
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

async function resolveMobileUserFromBearerToken(
  request: RequestLike
): Promise<AuthenticatedRequestContext | null> {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

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
    tokenPayload: verifiedToken as Record<string, unknown>,
  };
}

export async function getAuthenticatedRequestContext(
  request: RequestLike
): Promise<AuthenticatedRequestContext | null> {
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
      sessionClaims: authResult.sessionClaims,
    };
  }

  try {
    return await resolveMobileUserFromBearerToken(request);
  } catch (error) {
    console.error("Bearer token authentication failed", error);
    return null;
  }
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
