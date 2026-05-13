import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { mobileUserBridgeFromSupabaseUser } from "@/lib/auth/supabase-mobile-user-bridge";

export type AppShapeUserEmailAddress = {
  id: string;
  emailAddress: string;
  verification: { status: "verified" };
};

/**
 * Legacy Clerk-shaped user record backed by Supabase Auth (`supabaseUserToAppShape`).
 * Typed metadata objects so routes can read `publicMetadata.plan`, `privateMetadata.stripeCustomerId`, etc.
 */
export type AppShapeUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string | null;
  username: null;
  primaryEmailAddressId: string | null;
  emailAddresses: AppShapeUserEmailAddress[];
  primaryEmailAddress: { emailAddress: string } | null;
  publicMetadata: Record<string, unknown>;
  privateMetadata: Record<string, unknown>;
  unsafeMetadata: Record<string, unknown>;
  supabaseAuthUserId: string;
  _supabaseRaw: SupabaseAuthUser;
};

/** Legacy Supabase `user_metadata` key used when importing accounts from the previous auth provider. */
const LEGACY_IMPORTED_PRIVATE_META_KEY = "clerk_private_metadata";

function readObject(meta: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = meta[key];
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * Legacy `User` record shape used across routes — backed by Supabase Auth.
 */
export function supabaseUserToAppShape(user: SupabaseAuthUser): AppShapeUser {
  const bridge = mobileUserBridgeFromSupabaseUser(user);
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const legacyPrivate = readObject(meta, LEGACY_IMPORTED_PRIVATE_META_KEY);

  const onboarding =
    (meta.onboarding as Record<string, unknown> | undefined) ??
    (legacyPrivate.onboarding as Record<string, unknown> | undefined);
  const onboardingNew =
    (meta.onboardingNew as Record<string, unknown> | undefined) ??
    (legacyPrivate.onboardingNew as Record<string, unknown> | undefined);

  const privateMetadata: Record<string, unknown> = {
    ...legacyPrivate,
    ...(onboarding ? { onboarding } : {}),
    ...(onboardingNew ? { onboardingNew } : {}),
    stripeCustomerId:
      bridge.privateMetadata.stripeCustomerId ??
      (app.stripeCustomerId as string | undefined) ??
      (meta.stripeCustomerId as string | undefined) ??
      null,
  };

  const email = user.email?.trim() ?? "";
  const emailId = "primary";
  const emailAddresses = email
    ? [
        {
          id: emailId,
          emailAddress: email,
          verification: { status: "verified" as const },
        },
      ]
    : [];

  return {
    id: bridge.id,
    firstName: bridge.firstName,
    lastName: bridge.lastName,
    fullName:
      bridge.firstName && bridge.lastName
        ? `${bridge.firstName} ${bridge.lastName}`
        : bridge.firstName || bridge.lastName || null,
    imageUrl: bridge.imageUrl,
    username: null,
    primaryEmailAddressId: email ? emailId : null,
    emailAddresses,
    primaryEmailAddress: bridge.primaryEmailAddress,
    publicMetadata: bridge.publicMetadata,
    privateMetadata,
    unsafeMetadata: (meta.unsafeMetadata as Record<string, unknown> | undefined) ?? {},
    supabaseAuthUserId: user.id,
    _supabaseRaw: user,
  };
}
