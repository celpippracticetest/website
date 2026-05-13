import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedRscContext } from "@/lib/auth/request-auth";
import type { MobileUserBridge } from "@/lib/auth/supabase-mobile-user-bridge";

export const currentUser = cache(async (): Promise<MobileUserBridge | null> => {
  const ctx = await getAuthenticatedRscContext();
  return (ctx?.user as MobileUserBridge | undefined) ?? null;
});

export async function auth() {
  const ctx = await getAuthenticatedRscContext();

  const protect = async () => {
    if (!ctx?.userId) {
      redirect("/sign-in");
    }
  };

  if (!ctx) {
    return {
      userId: null as string | null,
      sessionId: null as string | null,
      sessionClaims: null as { metadata?: Record<string, unknown> } | null,
      protect,
    };
  }

  const meta = (ctx.user as { publicMetadata?: Record<string, unknown> }).publicMetadata ?? {};

  return {
    userId: ctx.userId,
    sessionId: ctx.sessionId ?? null,
    sessionClaims: { metadata: meta },
    protect,
  };
}

/** Clerk / bridge may expose roles as unknown; normalize before `.includes("admin")`. */
export function sessionClaimsHasAdminRole(
  claims: { metadata?: Record<string, unknown> } | null | undefined
): boolean {
  const roles = claims?.metadata?.roles;
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => r === "admin");
}
