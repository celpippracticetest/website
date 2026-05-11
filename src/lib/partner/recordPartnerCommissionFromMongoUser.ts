import mongoClient, { getDb } from "@/lib/mongodb";
import { PartnerRepository } from "@/repositories/partner.repo";
import { PartnerProgramSettingsRepository } from "@/repositories/partner-program-settings.repo";
import { PartnerCommissionRepository } from "@/repositories/partner-commission.repo";
import { logger } from "@/lib/sentry-logger";
import { ObjectId } from "bson";

type UsersDoc = {
  clerkUserId?: string;
  hasEverPurchased?: boolean;
  purchaseAmount?: number;
  purchaseCurrency?: string;
  paymentProvider?: string;
  partnerId?: string;
  partnerReferralCode?: string;
  partnerCommissionPercent?: number;
  publicMetadata?: Record<string, unknown>;
};

/**
 * After Mongo `users` reflects a purchase, credit the partner (if any) once per subscriber.
 * Does not call Stripe/PayPal — reads only Mongo + `partners`.
 */
export async function recordPartnerCommissionFromMongoUser(
  clerkUserId: string
): Promise<void> {
  try {
    const db = await getDb();
    const user = (await db
      .collection("users")
      .findOne({ clerkUserId })) as UsersDoc | null;

    if (!user?.hasEverPurchased) return;

    const gross = Number(user.purchaseAmount);
    if (!Number.isFinite(gross) || gross < 0.01) return;

    const pm = user.publicMetadata || {};
    const partnerIdRaw =
      (typeof user.partnerId === "string" && user.partnerId) ||
      (typeof pm.partnerId === "string" ? pm.partnerId : "");
    if (!partnerIdRaw || !ObjectId.isValid(partnerIdRaw)) return;

    const codeOnUser =
      (typeof user.partnerReferralCode === "string" && user.partnerReferralCode) ||
      (typeof pm.partnerReferralCode === "string" ? pm.partnerReferralCode : "");

    const partnerRepo = new PartnerRepository(mongoClient);
    await partnerRepo.ensureIndexes();
    const partner = await partnerRepo.findById(partnerIdRaw);
    if (!partner || partner.status !== "active") return;

    if (codeOnUser && partner.code !== codeOnUser.trim()) {
      logger.warn("Partner commission skipped: code mismatch", {
        component: "partner_commission",
        userId: clerkUserId,
        metadata: { partnerId: partnerIdRaw },
      });
      return;
    }

    let commissionPctFromUser =
      typeof user.partnerCommissionPercent === "number" &&
      Number.isFinite(user.partnerCommissionPercent)
        ? user.partnerCommissionPercent
        : typeof pm.partnerCommissionPercent === "number" &&
            Number.isFinite(pm.partnerCommissionPercent as number)
          ? (pm.partnerCommissionPercent as number)
          : typeof partner.commissionPercent === "number"
            ? partner.commissionPercent
            : NaN;
    if (!Number.isFinite(commissionPctFromUser)) {
      const settingsRepo = new PartnerProgramSettingsRepository(mongoClient);
      commissionPctFromUser = (await settingsRepo.getDefaults())
        .partnerCommissionPercent;
    }
    const commissionRate = Math.min(
      1,
      Math.max(0, commissionPctFromUser / 100)
    );

    const idempotencyKey = `subscriber:${clerkUserId}:first_purchase`;
    const currency = (
      typeof user.purchaseCurrency === "string"
        ? user.purchaseCurrency
        : "CAD"
    ).toUpperCase();

    const providerRaw = user.paymentProvider;
    const paymentProvider =
      providerRaw === "stripe" || providerRaw === "paypal"
        ? providerRaw
        : "unknown";

    const commissionRepo = new PartnerCommissionRepository(mongoClient);
    await commissionRepo.ensureIndexes();

    const result = await commissionRepo.insertCommission({
      partnerId: partner.id,
      subscriberClerkUserId: clerkUserId,
      paymentProvider,
      idempotencyKey,
      grossAmount: gross,
      commissionRate,
      commissionAmount: Math.round(gross * commissionRate * 100) / 100,
      currency,
      status: "pending",
    });

    if (result.inserted) {
      logger.info("Partner commission recorded", {
        component: "partner_commission",
        userId: clerkUserId,
        metadata: {
          partnerId: partner.id,
          commissionAmount: result.dto.commissionAmount,
        },
      });
    }
  } catch (err) {
    logger.error("recordPartnerCommissionFromMongoUser failed", {
      component: "partner_commission",
      userId: clerkUserId,
      metadata: { error: String(err) },
    });
  }
}
