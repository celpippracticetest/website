import "server-only";

import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";

/** Minimal auth user shape for mirroring into `users` / `user_profiles`. */
export type AuthUserDocSyncSource = {
  primaryEmailAddress?: { emailAddress: string } | null;
  emailAddresses?: { emailAddress: string }[];
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
};

/**
 * Resolves a normalized email for Postgres `user_profiles.email` and legacy user docs.
 */
export function resolveEmailForUserDoc(source: AuthUserDocSyncSource): string | null {
  const fromPrimary = source.primaryEmailAddress?.emailAddress?.trim();
  if (fromPrimary) return fromPrimary.toLowerCase();
  for (const entry of source.emailAddresses ?? []) {
    const e = entry.emailAddress?.trim();
    if (e) return e.toLowerCase();
  }
  return null;
}

/** Fields applied on `users` collection upsert insert (Stripe webhook and similar). */
export function usersCollectionSetOnInsertFromAuthUser(
  userId: string,
  source: AuthUserDocSyncSource,
): Record<string, unknown> {
  const email = resolveEmailForUserDoc(source);
  const identity = isLikelySupabaseAuthUserId(userId)
    ? supabaseAuthUserIdFieldsOnUserDoc(userId)
    : { clerkUserId: userId };

  return {
    createdAt: new Date(),
    ...identity,
    ...(email ? { email } : {}),
    ...(source.firstName?.trim() ? { firstName: source.firstName.trim() } : {}),
    ...(source.lastName?.trim() ? { lastName: source.lastName.trim() } : {}),
    ...(source.imageUrl?.trim() ? { imageUrl: source.imageUrl.trim() } : {}),
  };
}

/** `$set` patch so existing profiles without email get backfilled on the next sync. */
export function usersCollectionEmailSetFromAuthUser(
  source: AuthUserDocSyncSource,
): Record<string, unknown> {
  const email = resolveEmailForUserDoc(source);
  return email ? { email } : {};
}

/**
 * `users` documents in `app_documents`: match by persisted web auth id
 * (`supabaseUserId`, JWT `sub`, or legacy `clerkUserId`).
 */
export function matchUsersCollectionByWebUserIds(...userIds: string[]) {
  const ids = [
    ...new Set(
      userIds.filter((id) => typeof id === "string" && id.trim().length > 0),
    ),
  ];
  if (ids.length === 0) {
    throw new Error("matchUsersCollectionByWebUserIds requires at least one non-empty id");
  }
  const clauses = ids.flatMap((id) => [
    { supabaseUserId: id },
    { sub: id },
    { clerkUserId: id },
  ]);
  return { $or: clauses };
}

/** Set when syncing from Supabase Auth or session `user.id` (do not store UUID in `clerkUserId`). */
export function supabaseAuthUserIdFieldsOnUserDoc(userId: string) {
  return { supabaseUserId: userId, sub: userId };
}

/**
 * Mongo aggregation expression for the canonical web user id on `users` docs.
 * Prefers Supabase UUID (matches `useractivities.userId`) over legacy Clerk ids.
 */
export function mongoExprWebUserId() {
  return {
    $let: {
      vars: {
        supa: { $ifNull: ["$supabaseUserId", "$sub"] },
        clerk: "$clerkUserId",
      },
      in: {
        $cond: {
          if: {
            $and: [{ $eq: [{ $type: "$$supa" }, "string"] }, { $ne: ["$$supa", ""] }],
          },
          then: "$$supa",
          else: {
            $cond: {
              if: {
                $and: [{ $eq: [{ $type: "$$clerk" }, "string"] }, { $ne: ["$$clerk", ""] }],
              },
              then: "$$clerk",
              else: null,
            },
          },
        },
      },
    },
  };
}
