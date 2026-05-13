import { getDb } from "@/lib/appDocumentsClient";

/** Mirror partner attribution onto `users` top-level fields (and full publicMetadata). */
export async function syncPartnerFieldsToUserDocument(
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

  const pickStr = (k: string) =>
    typeof pm[k] === "string" ? (pm[k] as string) : undefined;
  const pickNum = (k: string) =>
    typeof pm[k] === "number" && Number.isFinite(pm[k] as number)
      ? (pm[k] as number)
      : undefined;
  const pickBool = (k: string) =>
    typeof pm[k] === "boolean" ? (pm[k] as boolean) : undefined;

  const partnerReferralPromotionId = pickStr("partnerReferralPromotionId");
  const partnerStripeDiscountCode = pickStr("partnerStripeDiscountCode");
  const partnerRefereeDiscountPercent = pickNum("partnerRefereeDiscountPercent");
  const partnerCommissionPercent = pickNum("partnerCommissionPercent");
  const partnerReferralDiscountActive = pickBool("partnerReferralDiscountActive");
  const partnerReferralDiscountUsed = pickBool("partnerReferralDiscountUsed");
  const partnerReferralDiscountExpiry = pickStr("partnerReferralDiscountExpiry");

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
  if (partnerReferralPromotionId !== undefined) {
    $set.partnerReferralPromotionId = partnerReferralPromotionId;
  }
  if (partnerStripeDiscountCode !== undefined) {
    $set.partnerStripeDiscountCode = partnerStripeDiscountCode;
  }
  if (partnerRefereeDiscountPercent !== undefined) {
    $set.partnerRefereeDiscountPercent = partnerRefereeDiscountPercent;
  }
  if (partnerCommissionPercent !== undefined) {
    $set.partnerCommissionPercent = partnerCommissionPercent;
  }
  if (partnerReferralDiscountActive !== undefined) {
    $set.partnerReferralDiscountActive = partnerReferralDiscountActive;
  }
  if (partnerReferralDiscountUsed !== undefined) {
    $set.partnerReferralDiscountUsed = partnerReferralDiscountUsed;
  }
  if (partnerReferralDiscountExpiry !== undefined) {
    $set.partnerReferralDiscountExpiry = partnerReferralDiscountExpiry;
  }

  await db.collection("users").updateOne(
    { clerkUserId },
    { $set },
    { upsert: true }
  );
}
