const MAX_JSON_SNAPSHOT = 8000;

/** Minimal Clerk user shape from `clerkClient().users.getUserList()`. */
export type ClerkUserLike = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: unknown;
  privateMetadata: unknown;
};

function jsonSnapshot(value: unknown): unknown {
  try {
    const s = JSON.stringify(value);
    if (s.length <= MAX_JSON_SNAPSHOT) return JSON.parse(s) as unknown;
    return {
      _truncated: true,
      _originalLength: s.length,
      preview: s.slice(0, MAX_JSON_SNAPSHOT),
    };
  } catch {
    return { _nonSerializable: true };
  }
}

/**
 * Maps a Clerk user into Supabase Auth `user_metadata` / `app_metadata`
 * so `readPracticePlanFromSupabaseUser` and `mobileUserBridgeFromSupabaseUser` behave like Clerk.
 */
export function buildSupabaseAuthPayloadFromClerkUser(clerkUser: ClerkUserLike): {
  email: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
} {
  const email =
    clerkUser.primaryEmailAddress?.emailAddress?.trim() ||
    clerkUser.emailAddresses?.[0]?.emailAddress?.trim() ||
    null;

  const publicMeta = (clerkUser.publicMetadata ?? {}) as Record<string, unknown>;
  const privateMeta = (clerkUser.privateMetadata ?? {}) as Record<string, unknown>;

  const plan = (typeof publicMeta.plan === "string" && publicMeta.plan) || "free";
  const purchaseDate =
    typeof publicMeta.purchaseDate === "string" ? publicMeta.purchaseDate : undefined;

  const user_metadata: Record<string, unknown> = {
    clerk_user_id: clerkUser.id,
    migrated_from_clerk_at: new Date().toISOString(),
    first_name: clerkUser.firstName ?? undefined,
    last_name: clerkUser.lastName ?? undefined,
    full_name: clerkUser.fullName ?? undefined,
    avatar_url: clerkUser.imageUrl ?? undefined,
    picture: clerkUser.imageUrl ?? undefined,
    clerk_public_metadata: jsonSnapshot(publicMeta),
  };

  const stripeCustomerId =
    (typeof privateMeta.stripeCustomerId === "string" && privateMeta.stripeCustomerId) ||
    (typeof publicMeta.stripeCustomerId === "string" && publicMeta.stripeCustomerId) ||
    undefined;

  const purchasedMockExamIds = Array.isArray(publicMeta.purchasedMockExamIds)
    ? publicMeta.purchasedMockExamIds
    : undefined;

  const app_metadata: Record<string, unknown> = {
    plan,
    ...(purchaseDate ? { purchaseDate } : {}),
    ...(typeof publicMeta.planType === "string" ? { planType: publicMeta.planType } : {}),
    ...(typeof publicMeta.planCancelled === "boolean"
      ? { planCancelled: publicMeta.planCancelled }
      : {}),
    ...(typeof publicMeta.planRenewsAt === "string" ? { planRenewsAt: publicMeta.planRenewsAt } : {}),
    ...(typeof publicMeta.planExpiresAt === "string"
      ? { planExpiresAt: publicMeta.planExpiresAt }
      : {}),
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
    ...(purchasedMockExamIds ? { purchasedMockExamIds } : {}),
    clerk_private_metadata: jsonSnapshot(privateMeta),
  };

  return { email, user_metadata, app_metadata };
}
