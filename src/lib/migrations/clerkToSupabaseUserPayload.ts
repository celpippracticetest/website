/**
 * Minimal Clerk user shape from `@clerk/backend` list/get APIs (JSON fields).
 */
export type ClerkUserLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{ id?: string; emailAddress?: string }>;
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
};

export function buildSupabaseAuthPayloadFromClerkUser(cu: ClerkUserLike): {
  email: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
} {
  const emails = cu.emailAddresses ?? [];
  const primaryId = cu.primaryEmailAddressId;
  const primary = emails.find((e) => e.id === primaryId) ?? emails[0];
  const email = primary?.emailAddress?.trim().toLowerCase() ?? null;

  const pub = { ...(cu.publicMetadata ?? {}) };
  const priv = { ...(cu.privateMetadata ?? {}) };
  const unsafe = { ...(cu.unsafeMetadata ?? {}) };

  const fullName = [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim();

  const user_metadata: Record<string, unknown> = {
    ...unsafe,
    clerkUserId: cu.id,
    clerk_user_id: cu.id,
    first_name: cu.firstName ?? undefined,
    last_name: cu.lastName ?? undefined,
    given_name: cu.firstName ?? undefined,
    family_name: cu.lastName ?? undefined,
    ...(fullName ? { full_name: fullName, name: fullName } : {}),
    ...(cu.imageUrl
      ? { avatar_url: cu.imageUrl, picture: cu.imageUrl, image_url: cu.imageUrl }
      : {}),
    clerk_public_metadata: pub,
    clerk_private_metadata: priv,
  };

  const app_metadata: Record<string, unknown> = {
    ...pub,
    plan: (pub.plan as string | undefined) ?? "free",
  };

  return { email, user_metadata, app_metadata };
}
