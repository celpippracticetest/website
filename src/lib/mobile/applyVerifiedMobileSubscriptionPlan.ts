import { clerkClient } from "@clerk/nextjs/server";

import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import mongoClient from "@/lib/mongodb";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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
 * Maps App Store / Play product id to plan (`premium` | `pro` | …).
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

async function updateMongoUserPlan(args: {
  userId: string;
  plan: string;
  platform: "google_play" | "apple";
}): Promise<void> {
  if (!mongoClient) return;
  try {
    const db = mongoClient.db();
    const usersCollection = db.collection("users");
    const filter = isLikelySupabaseAuthUserId(args.userId)
      ? { supabaseUserId: args.userId }
      : { clerkUserId: args.userId };
    const publicMetadata = { plan: args.plan, planSource: args.platform };
    await usersCollection.updateOne(
      filter,
      {
        $set: {
          publicMetadata,
          plan: args.plan,
          updatedAt: new Date(),
          ...(isLikelySupabaseAuthUserId(args.userId)
            ? { supabaseUserId: args.userId }
            : { clerkUserId: args.userId }),
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
}

/**
 * After a verified store purchase, align auth user metadata (Clerk or Supabase)
 * and Mongo user doc with web Stripe behavior.
 */
export async function applyVerifiedMobileSubscriptionPlan(args: {
  userId: string;
  /** When the stable `userId` is a Clerk id, pass the real Supabase Auth UUID for Admin API calls. */
  supabaseAuthUserId?: string | null;
  productId: string;
  platform: "google_play" | "apple";
}): Promise<{ plan: string }> {
  const plan = resolvePlanFromMobileProductId(args.productId);

  const supabaseAdminTarget =
    args.supabaseAuthUserId?.trim() ||
    (isLikelySupabaseAuthUserId(args.userId) ? args.userId : null);

  if (supabaseAdminTarget) {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error("Supabase admin client is not configured.");
    }

    const { data: existing, error: getErr } = await admin.auth.admin.getUserById(
      supabaseAdminTarget
    );
    if (getErr || !existing.user) {
      throw new Error(getErr?.message || "Supabase user not found.");
    }

    const currentApp = (existing.user.app_metadata ?? {}) as Record<string, unknown>;
    await admin.auth.admin.updateUserById(supabaseAdminTarget, {
      app_metadata: {
        ...currentApp,
        plan,
        planSource: args.platform,
      },
    });

    await updateMongoUserPlan({
      userId: args.userId,
      plan,
      platform: args.platform,
    });

    logger.info("Updated plan from verified mobile purchase (Supabase)", {
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

  await updateMongoUserPlan({
    userId: args.userId,
    plan,
    platform: args.platform,
  });

  logger.info("Updated plan from verified mobile purchase (Clerk)", {
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
