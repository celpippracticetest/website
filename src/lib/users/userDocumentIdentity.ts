import "server-only";

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
