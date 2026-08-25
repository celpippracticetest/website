import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { readLegacyImportedExternalUserId, normalizePracticePlan } from "@/lib/auth/supabase-user-plan";

/**
 * Minimal bridge user shape for mobile API routes (legacy field compatibility).
 */
type OnboardingMeta = Record<string, unknown>;

export type MobileUserBridge = {
  /**
   * Stable id for user documents and legacy rows: imported external id when present in
   * `user_metadata`, otherwise the Supabase Auth UUID.
   */
  id: string;
  /** Present only for Supabase-backed sessions: real Auth user id for Admin API calls. */
  supabaseAuthUserId?: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: Record<string, unknown>;
  privateMetadata: {
    stripeCustomerId?: string | null;
    onboarding?: OnboardingMeta;
    onboardingNew?: OnboardingMeta;
  };
};

/** Legacy Supabase `user_metadata` key used when importing accounts from the previous auth provider. */
const LEGACY_IMPORTED_PRIVATE_META_KEY = "clerk_private_metadata";

function readObject(meta: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = meta[key];
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

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
  const legacyImportedId = readLegacyImportedExternalUserId(user);
  const stableId = legacyImportedId ?? user.id;

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

  // For imported accounts, purchasedMockExamIds lives in app_metadata (new migrations)
  // or nested in user_metadata legacy public metadata (older migrations). Read both paths.
  const legacyPublicMeta = (meta.clerk_public_metadata ?? {}) as Record<string, unknown>;
  const purchasedMockExamIds =
    app.purchasedMockExamIds ?? legacyPublicMeta.purchasedMockExamIds ?? meta.purchasedMockExamIds;

  const roleList = Array.isArray(app.roles)
    ? app.roles
    : Array.isArray(meta.roles)
      ? meta.roles
      : undefined;

  const publicMetadata: Record<string, unknown> = {
    ...meta,
    plan: normalizePracticePlan(app.plan ?? meta.plan ?? "free"),
    planType: app.planType ?? meta.planType,
    planSource: app.planSource ?? meta.planSource,
    planCancelled: app.planCancelled ?? meta.planCancelled,
    planRenewsAt: app.planRenewsAt ?? meta.planRenewsAt,
    planExpiresAt: app.planExpiresAt ?? meta.planExpiresAt,
    targetCLB: app.targetCLB ?? meta.targetCLB ?? meta.targetClb,
    ...(purchasedMockExamIds !== undefined ? { purchasedMockExamIds } : {}),
    purchaseDate: app.purchaseDate ?? meta.purchaseDate,
  };
  if (roleList !== undefined) {
    publicMetadata.roles = roleList;
  }

  const legacyPrivate = readObject(meta, LEGACY_IMPORTED_PRIVATE_META_KEY);
  const onboarding =
    (meta.onboarding as OnboardingMeta | undefined) ??
    (legacyPrivate.onboarding as OnboardingMeta | undefined);
  const onboardingNew =
    (meta.onboardingNew as OnboardingMeta | undefined) ??
    (legacyPrivate.onboardingNew as OnboardingMeta | undefined);

  return {
    id: stableId,
    supabaseAuthUserId: user.id,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    imageUrl: imageUrl ?? null,
    primaryEmailAddress: email ? { emailAddress: email } : null,
    emailAddresses: email ? [{ emailAddress: email }] : [],
    publicMetadata,
    privateMetadata: {
      ...legacyPrivate,
      ...(onboarding ? { onboarding } : {}),
      ...(onboardingNew ? { onboardingNew } : {}),
      stripeCustomerId:
        (app.stripeCustomerId as string | undefined) ??
        (meta.stripeCustomerId as string | undefined) ??
        (legacyPrivate.stripeCustomerId as string | undefined) ??
        null,
    },
  };
}
