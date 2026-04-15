import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { PartnerRepository } from "@/repositories/partner.repo";
import { PartnerProgramSettingsRepository } from "@/repositories/partner-program-settings.repo";
import { ReferralRepository } from "@/repositories/referral.repo";
import { syncPartnerFieldsToMongoUser } from "@/lib/partner/syncPartnerFieldsToMongo";
import { createPartnerRefereeStripeDiscount } from "@/lib/partner/createPartnerRefereeStripeDiscount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ApplyPendingCodeKind = "partner" | "user_referral" | "none";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code =
      typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      return NextResponse.json(
        { kind: "none" as ApplyPendingCodeKind },
        { status: 200 }
      );
    }

    const partnerRepo = new PartnerRepository(mongoClient);
    await partnerRepo.ensureIndexes();
    const activePartner = await partnerRepo.findActiveByCode(code);

    if (activePartner) {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const current = (user.publicMetadata || {}) as Record<string, unknown>;
      if (
        typeof current.partnerId === "string" &&
        current.partnerId === activePartner.id &&
        typeof current.partnerReferralPromotionId === "string"
      ) {
        return NextResponse.json({
          kind: "partner" as ApplyPendingCodeKind,
          partnerCode: activePartner.code,
          alreadyApplied: true,
        });
      }

      const partnerAttributedAt =
        typeof current.partnerAttributedAt === "string"
          ? current.partnerAttributedAt
          : new Date().toISOString();

      const settingsRepo = new PartnerProgramSettingsRepository(mongoClient);
      const programDefaults = await settingsRepo.getDefaults();
      const discountPct =
        typeof activePartner.referredDiscountPercent === "number"
          ? activePartner.referredDiscountPercent
          : programDefaults.referredDiscountPercent;
      const commissionPct =
        typeof activePartner.commissionPercent === "number"
          ? activePartner.commissionPercent
          : programDefaults.partnerCommissionPercent;

      const partnerDiscountExpiry = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString();

      let partnerReferralPromotionId: string | undefined =
        typeof current.partnerReferralPromotionId === "string"
          ? current.partnerReferralPromotionId
          : undefined;
      let partnerStripeDiscountCode: string | undefined =
        typeof current.partnerStripeDiscountCode === "string"
          ? current.partnerStripeDiscountCode
          : undefined;
      if (!partnerReferralPromotionId) {
        try {
          const stripeDiscount = await createPartnerRefereeStripeDiscount({
            partnerMongoId: activePartner.id,
            partnerDisplayCode: activePartner.code,
            clerkUserId: userId,
            discountPercent: discountPct,
          });
          partnerReferralPromotionId = stripeDiscount.promotionId;
          partnerStripeDiscountCode = stripeDiscount.stripePromotionCustomerCode;
        } catch (stripeErr) {
          console.error(
            "[apply-pending-code] Partner Stripe discount failed (attribution still saved)",
            stripeErr
          );
        }
      }

      const publicMetadata: Record<string, unknown> = {
        ...current,
        partnerId: activePartner.id,
        partnerReferralCode: activePartner.code,
        partnerAttributedAt,
        onboardingCompleted: true,
        partnerRefereeDiscountPercent: discountPct,
        partnerCommissionPercent: commissionPct,
        partnerReferralDiscountActive: true,
        partnerReferralDiscountUsed: false,
        partnerReferralDiscountExpiry: partnerDiscountExpiry,
        ...(partnerReferralPromotionId
          ? {
              partnerReferralPromotionId,
              partnerStripeDiscountCode,
            }
          : {}),
      };

      await clerk.users.updateUserMetadata(userId, { publicMetadata });
      await syncPartnerFieldsToMongoUser(userId, publicMetadata);

      return NextResponse.json({
        kind: "partner" as ApplyPendingCodeKind,
        partnerCode: activePartner.code,
        partnerDiscountPercent: discountPct,
        partnerCommissionPercent: commissionPct,
        partnerStripeDiscountCreated: Boolean(partnerReferralPromotionId),
      });
    }

    const refRepo = new ReferralRepository(mongoClient);
    await refRepo.ensureIndexes();
    const referrer = await refRepo.findOneByCode(code);
    if (referrer) {
      return NextResponse.json({ kind: "user_referral" as ApplyPendingCodeKind });
    }

    return NextResponse.json({ kind: "none" as ApplyPendingCodeKind });
  } catch (e) {
    console.error("[apply-pending-code]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
