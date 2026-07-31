import "server-only";

import documentsClient from "@/lib/appDocumentsClient";
import { findUserProfileByWebUserId } from "@/lib/users/userProfilesPg";

export type LocalUserDisplay = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string | null;
};

function displayNameFromParts(
  firstName: string | null,
  lastName: string | null,
  email: string | null,
  fallback = "User",
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`.trim();
  if (firstName) return firstName;
  if (email?.includes("@")) return email.split("@")[0] || fallback;
  return fallback;
}

export function formatLocalUserDisplayName(
  info: Pick<LocalUserDisplay, "firstName" | "lastName" | "email">,
  fallback = "User",
): string {
  return displayNameFromParts(info.firstName, info.lastName, info.email, fallback);
}

/**
 * Loads display fields from `user_profiles` / local `users` docs — no Auth Admin calls.
 */
export async function findLocalUserDisplay(
  userId: string,
): Promise<LocalUserDisplay | null> {
  const id = userId.trim();
  if (!id) return null;

  try {
    const profile = await findUserProfileByWebUserId(id);
    if (profile && (profile.first_name || profile.last_name || profile.email || profile.image_url)) {
      return {
        userId: id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        imageUrl: profile.image_url,
      };
    }
  } catch {
    // Fall through to documents store.
  }

  try {
    const db = await documentsClient.db();
    const row = await db.collection("users").findOne(
      { $or: [{ clerkUserId: id }, { supabaseUserId: id }, { sub: id }] },
      {
        projection: {
          clerkUserId: 1,
          supabaseUserId: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          imageUrl: 1,
        },
      },
    );
    if (!row) return null;
    return {
      userId: id,
      firstName: typeof row.firstName === "string" ? row.firstName : null,
      lastName: typeof row.lastName === "string" ? row.lastName : null,
      email: typeof row.email === "string" ? row.email : null,
      imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
    };
  } catch {
    return null;
  }
}

/** Batch local display lookups (profile / documents only). */
export async function findLocalUserDisplays(
  userIds: string[],
): Promise<Map<string, LocalUserDisplay>> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  const out = new Map<string, LocalUserDisplay>();
  await Promise.all(
    unique.map(async (id) => {
      const info = await findLocalUserDisplay(id);
      if (info) out.set(id, info);
    }),
  );
  return out;
}
