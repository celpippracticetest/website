import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

/**
 * Minimal Clerk-shaped user for mobile API routes that were built around Clerk.
 */
export type MobileUserBridge = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: Record<string, unknown>;
  privateMetadata: { stripeCustomerId?: string | null };
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLikelySupabaseAuthUserId(userId: string): boolean {
  return UUID_RE.test(userId.trim());
}

function readString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

export function mobileUserBridgeFromSupabaseUser(
  user: SupabaseAuthUser
): MobileUserBridge {
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email?.trim() ?? "";

  const given =
    readString(meta, "given_name") ||
    readString(meta, "first_name") ||
    readString(meta, "firstName");
  const family =
    readString(meta, "family_name") ||
    readString(meta, "last_name") ||
    readString(meta, "lastName");
  const full = readString(meta, "full_name") || readString(meta, "name");

  let firstName = given;
  let lastName = family;
  if (!firstName && full) {
    const parts = full.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? null;
    lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  }

  const imageUrl =
    readString(meta, "avatar_url") ||
    readString(meta, "picture") ||
    readString(meta, "image_url");

  const publicMetadata: Record<string, unknown> = {
    ...meta,
    plan: app.plan ?? meta.plan ?? "free",
    planType: app.planType ?? meta.planType,
    planCancelled: app.planCancelled ?? meta.planCancelled,
    planRenewsAt: app.planRenewsAt ?? meta.planRenewsAt,
    planExpiresAt: app.planExpiresAt ?? meta.planExpiresAt,
    targetCLB: app.targetCLB ?? meta.targetCLB ?? meta.targetClb,
  };

  return {
    id: user.id,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    imageUrl: imageUrl ?? null,
    primaryEmailAddress: email ? { emailAddress: email } : null,
    emailAddresses: email ? [{ emailAddress: email }] : [],
    publicMetadata,
    privateMetadata: {
      stripeCustomerId:
        (app.stripeCustomerId as string | undefined) ??
        (meta.stripeCustomerId as string | undefined) ??
        null,
    },
  };
}
