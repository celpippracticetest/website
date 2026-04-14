import mongoClient, { getDb } from "@/lib/mongodb";
import { PartnerRepository } from "@/repositories/partner.repo";
import { PartnerCommissionRepository } from "@/repositories/partner-commission.repo";
import { logger } from "@/lib/sentry-logger";
import { ObjectId } from "mongodb";

const COMMISSION_RATE = 0.3;

type UsersDoc = {
  clerkUserId?: string;
  hasEverPurchased?: boolean;
  purchaseAmount?: number;
  purchaseCurrency?: string;
  paymentProvider?: string;
  partnerId?: string;
  partnerReferralCode?: string;
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
      commissionRate: COMMISSION_RATE,
      commissionAmount: Math.round(gross * COMMISSION_RATE * 100) / 100,
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
