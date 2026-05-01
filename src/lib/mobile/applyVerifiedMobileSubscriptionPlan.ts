import { clerkClient } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { logger } from "@/lib/sentry-logger";
import { planNameIndicatesPremiumPlus } from "@/lib/subscriptionAccess";

function parseProductPlanMap(): Record<string, string> {
  const raw = process.env.MOBILE_IAP_PRODUCT_PLAN_JSON?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(
          ([k, v]) => typeof k === "string" && typeof v === "string"
        ) as [string, string][]
      );
    }
  } catch {
    // ignore
  }
  return {};
}

/**
 * Maps App Store / Play product id to Clerk `publicMetadata.plan` (`premium` | `pro` | …).
 * Override with env `MOBILE_IAP_PRODUCT_PLAN_JSON` e.g. `{"celpip_premium_monthly":"premium"}`.
 */
export function resolvePlanFromMobileProductId(productId: string): string {
  const map = parseProductPlanMap();
  const mapped = map[productId];
  if (typeof mapped === "string" && mapped.trim()) {
    return mapped.trim();
  }
  return planNameIndicatesPremiumPlus(productId) ? "pro" : "premium";
}

/**
 * After a verified store purchase, align Clerk (and Mongo user doc) with web Stripe behavior.
 */
export async function applyVerifiedMobileSubscriptionPlan(args: {
  userId: string;
  productId: string;
  platform: "google_play" | "apple";
}): Promise<{ plan: string }> {
  const plan = resolvePlanFromMobileProductId(args.productId);
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(args.userId);
  const currentMetadata = (user.publicMetadata || {}) as Record<string, unknown>;
  const updatedMetadata = {
    ...currentMetadata,
    plan,
    planSource: args.platform,
  };

  await clerk.users.updateUserMetadata(args.userId, {
    publicMetadata: updatedMetadata,
  });

  try {
    const db = mongoClient.db();
    const usersCollection = db.collection("users");
    await usersCollection.updateOne(
      { clerkUserId: args.userId },
      {
        $set: {
          publicMetadata: updatedMetadata,
          plan,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (e) {
    logger.warn("Mongo user plan sync skipped or failed after mobile IAP", {
      component: "mobile_iap",
      userId: args.userId,
      metadata: { error: String(e) },
    });
  }

  logger.info("Updated plan from verified mobile purchase", {
    component: "mobile_iap",
    userId: args.userId,
    metadata: {
      platform: args.platform,
      productId: args.productId,
      plan,
    },
  });

  return { plan };
}
