import { appUserAdmin } from "@/lib/auth/server-auth";
import { getDb } from "@/lib/appDocumentsClient";
import { logger, captureException } from "@/lib/sentry-logger";
import { planNameIndicatesPremiumPlus } from "@/lib/subscriptionAccess";
import { recordPartnerCommissionForSubscriber } from "@/lib/partner/recordPartnerCommissionForSubscriber";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import {
  matchUsersCollectionByWebUserIds,
  supabaseAuthUserIdFieldsOnUserDoc,
} from "@/lib/users/userDocumentIdentity";

export async function applyPayPalSubscriptionEntitlements(params: {
  userId: string;
  planDisplayName: string;
  purchaseAmount: number;
  purchaseCurrency: string;
  planRenewsAtIso?: string | null;
}): Promise<void> {
  try {
    const authAdmin = await appUserAdmin();
    const user = await authAdmin.users.getUser(params.userId);
    const userMetadata = user.publicMetadata as Record<string, unknown>;

    const hasDiscountFields = Boolean(
      userMetadata?.referralCode ||
        userMetadata?.referralPromotionId ||
        userMetadata?.promotionCodeId ||
        userMetadata?.couponId ||
        userMetadata?.couponCode
    );

    const totalSpend = (Number(userMetadata.totalSpend) || 0) + params.purchaseAmount;

    const baseFields: Record<string, unknown> = {
      planCancelled: false,
      planExpiresAt: null,
      hasEverPurchased: true,
      purchaseDate: new Date().toISOString(),
      plan: planNameIndicatesPremiumPlus(params.planDisplayName) ? "pro" : "plus",
      planType: params.planDisplayName,
      purchaseAmount: params.purchaseAmount,
      purchaseCurrency: params.purchaseCurrency.toUpperCase(),
      totalSpend,
      paymentProvider: "paypal",
    };

    if (params.planRenewsAtIso) {
      baseFields.planRenewsAt = params.planRenewsAtIso;
    }

    const discountClear: Record<string, null> = {
      referralCode: null,
      referralPromotionId: null,
      promotionCodeId: null,
      couponId: null,
      couponCode: null,
    };

    const newFields = hasDiscountFields ? { ...baseFields, ...discountClear } : baseFields;

    const currentMetadata = user.publicMetadata || {};
    const updatedMetadata = { ...currentMetadata, ...newFields };

    await authAdmin.users.updateUserMetadata(params.userId, {
      publicMetadata: updatedMetadata,
    });

    const db = await getDb();
    const updateDoc: Record<string, unknown> = {
      publicMetadata: updatedMetadata,
      updatedAt: new Date(),
    };
    if (newFields.plan !== undefined) updateDoc.plan = newFields.plan;
    if (newFields.planType !== undefined) updateDoc.planType = newFields.planType;
    if (newFields.planCancelled !== undefined) updateDoc.planCancelled = newFields.planCancelled;
    if (newFields.planExpiresAt !== undefined) updateDoc.planExpiresAt = newFields.planExpiresAt;
    if (newFields.planRenewsAt !== undefined) updateDoc.planRenewsAt = newFields.planRenewsAt;
    if (newFields.purchaseDate !== undefined) updateDoc.purchaseDate = newFields.purchaseDate;
    if (newFields.hasEverPurchased !== undefined) {
      updateDoc.hasEverPurchased = newFields.hasEverPurchased;
    }
    if (newFields.paymentProvider !== undefined) {
      updateDoc.paymentProvider = newFields.paymentProvider;
    }
    if (newFields.purchaseAmount !== undefined) {
      updateDoc.purchaseAmount = newFields.purchaseAmount;
    }
    if (newFields.purchaseCurrency !== undefined) {
      updateDoc.purchaseCurrency = newFields.purchaseCurrency;
    }
    if (newFields.totalSpend !== undefined) updateDoc.totalSpend = newFields.totalSpend;
    if (typeof updatedMetadata.partnerId === "string") {
      updateDoc.partnerId = updatedMetadata.partnerId;
    }
    if (typeof updatedMetadata.partnerReferralCode === "string") {
      updateDoc.partnerReferralCode = updatedMetadata.partnerReferralCode;
    }
    if (typeof updatedMetadata.partnerAttributedAt === "string") {
      updateDoc.partnerAttributedAt = updatedMetadata.partnerAttributedAt;
    }

    await db.collection("users").updateOne(
      matchUsersCollectionByWebUserIds(params.userId),
      {
        $set: updateDoc,
        $setOnInsert: {
          createdAt: new Date(),
          ...(isLikelySupabaseAuthUserId(params.userId)
            ? supabaseAuthUserIdFieldsOnUserDoc(params.userId)
            : { clerkUserId: params.userId }),
        },
      },
      { upsert: true }
    );

    await recordPartnerCommissionForSubscriber(params.userId);

    logger.info("PayPal subscription entitlements applied", {
      component: "paypal_subscriptions",
      action: "apply_entitlements",
      userId: params.userId,
      metadata: { planType: params.planDisplayName },
    });
  } catch (error) {
    captureException(error, {
      component: "paypal_subscriptions",
      action: "apply_entitlements_error",
      userId: params.userId,
    });
    throw error;
  }
}
