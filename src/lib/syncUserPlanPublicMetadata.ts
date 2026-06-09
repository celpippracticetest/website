import { appUserAdmin } from "@/lib/auth/server-auth";
import documentsClient from "@/lib/appDocumentsClient";

export type PlanPublicMetadataPatch = {
  plan: string;
  planType?: string;
  planCancelled?: boolean;
  planExpiresAt?: string | null;
};

/**
 * Merges into `publicMetadata` (Supabase Auth / app bridge) and mirrors plan fields to the `users`
 * collection (same pattern as Stripe webhook `updateUserPublicMetadata`).
 */
export async function syncUserPlanPublicMetadata(
  userId: string,
  patch: PlanPublicMetadataPatch
) {
  const client = await appUserAdmin();
  const user = await client.users.getUser(userId);
  const current = (user.publicMetadata || {}) as Record<string, unknown>;
  const publicMetadata = { ...current, ...patch };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: patch,
  });

  try {
    const db = await documentsClient.db();
    const $set: Record<string, unknown> = {
      publicMetadata,
      updatedAt: new Date(),
    };
    if (patch.plan !== undefined) $set.plan = patch.plan;
    if (patch.planType !== undefined) $set.planType = patch.planType;

    await db.collection("users").updateOne(
      { $or: [{ clerkUserId: userId }, { supabaseUserId: userId }] },
      { $set },
      { upsert: true }
    );
  } catch (err) {
    console.error("[syncUserPlanPublicMetadata] user document sync failed", err);
  }
}
