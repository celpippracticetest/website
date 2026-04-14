import { getDb } from "@/lib/mongodb";

/** Mirror partner attribution onto `users` top-level fields (and full publicMetadata). */
export async function syncPartnerFieldsToMongoUser(
  clerkUserId: string,
  publicMetadata: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  const pm = publicMetadata;
  const partnerId = typeof pm.partnerId === "string" ? pm.partnerId : undefined;
  const partnerReferralCode =
    typeof pm.partnerReferralCode === "string"
      ? pm.partnerReferralCode
      : undefined;
  const partnerAttributedAt =
    typeof pm.partnerAttributedAt === "string"
      ? pm.partnerAttributedAt
      : undefined;

  const $set: Record<string, unknown> = {
    publicMetadata: pm,
    updatedAt: new Date(),
  };
  if (partnerId !== undefined) $set.partnerId = partnerId;
  if (partnerReferralCode !== undefined) {
    $set.partnerReferralCode = partnerReferralCode;
  }
  if (partnerAttributedAt !== undefined) {
    $set.partnerAttributedAt = partnerAttributedAt;
  }

  await db.collection("users").updateOne(
    { clerkUserId },
    { $set },
    { upsert: true }
  );
}
