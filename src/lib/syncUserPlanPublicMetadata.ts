import { clerkClient } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";

export type PlanPublicMetadataPatch = {
  plan: string;
  planType?: string;
  planCancelled?: boolean;
  planExpiresAt?: string | null;
};

/**
 * Merges into Clerk `publicMetadata` and mirrors plan fields to MongoDB `users`
 * (same pattern as Stripe webhook `updateUserPublicMetadata`).
 */
export async function syncUserPlanPublicMetadata(
  userId: string,
  patch: PlanPublicMetadataPatch
) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const current = (user.publicMetadata || {}) as Record<string, unknown>;
  const publicMetadata = { ...current, ...patch };

  await client.users.updateUserMetadata(userId, {
    publicMetadata,
  });

  try {
    const db = await mongoClient.db();
    const $set: Record<string, unknown> = {
      publicMetadata,
      updatedAt: new Date(),
    };
    if (patch.plan !== undefined) $set.plan = patch.plan;
    if (patch.planType !== undefined) $set.planType = patch.planType;

    await db.collection("users").updateOne(
      { clerkUserId: userId },
      { $set },
      { upsert: true }
    );
  } catch (err) {
    console.error("[syncUserPlanPublicMetadata] MongoDB sync failed", err);
  }
}
