import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/sentry-logger";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";

/** Upserts a Google Play purchase token → user mapping for RTDN lookups. */
export async function trackGooglePlayPurchaseToken(args: {
  supabaseAuthUserId: string;
  purchaseToken: string;
  subscriptionId: string;
  packageName: string;
  plan: string;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { error } = await admin.from("google_play_subscriptions").upsert(
    {
      purchase_token: args.purchaseToken,
      supabase_user_id: args.supabaseAuthUserId,
      subscription_id: args.subscriptionId,
      package_name: args.packageName,
      plan: args.plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "purchase_token" }
  );
  if (error) {
    logger.warn("Failed to track Google Play purchase token", {
      component: "mobile_iap",
      userId: args.supabaseAuthUserId,
      metadata: { error: error.message },
    });
  }
}

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
 * Maps App Store / Play product id to `publicMetadata.plan`.
 * Override with env `MOBILE_IAP_PRODUCT_PLAN_JSON` e.g. `{"celpip_premium_monthly":"plus"}`.
 * Default: all paid mobile subscriptions use `plus`.
 */
export function resolvePlanFromMobileProductId(productId: string): string {
  const map = parseProductPlanMap();
  const mapped = map[productId] ?? map[productId.split("|")[0] ?? ""];
  if (typeof mapped === "string" && mapped.trim()) {
    return mapped.trim();
  }
  return "plus";
}

/** Billing label stored as `planType` (same field Stripe checkout writes). */
export function resolvePlanTypeFromMobileProductId(productId: string): string {
  const spec = productId.trim().toLowerCase();
  const basePlan = spec.includes("|") ? spec.split("|")[1] ?? spec : spec;
  if (basePlan.includes("3-month") || basePlan.includes("3month") || basePlan.includes("quarter")) {
    return "3-month";
  }
  if (basePlan.includes("month")) return "monthly";
  if (basePlan.includes("week")) return "weekly";
  if (basePlan.includes("year")) return "yearly";
  return productId.trim();
}

/**
 * After a verified store purchase, align auth user metadata and the `users` document with web Stripe behavior.
 * Pass `purchaseToken` for Google Play purchases so RTDN renewals/cancellations can be matched to the user.
 */
export async function applyVerifiedMobileSubscriptionPlan(args: {
  userId: string;
  /** When the stable `userId` is a Clerk id, pass the real Supabase Auth UUID for Admin API calls. */
  supabaseAuthUserId?: string | null;
  productId: string;
  platform: "google_play" | "apple";
  /** Google Play purchase token — stored for RTDN event lookups. */
  purchaseToken?: string | null;
  /** Google Play package name — stored alongside the purchase token. */
  packageName?: string | null;
  /** Latest line-item expiry from Play / App Store, ISO string. */
  expiresAtIso?: string | null;
}): Promise<{ plan: string }> {
  const plan = resolvePlanFromMobileProductId(args.productId);
  const planType = resolvePlanTypeFromMobileProductId(args.productId);
  const purchaseDate = new Date().toISOString();
  const expiresAt = args.expiresAtIso?.trim() || null;

  const patch = {
    plan,
    planType,
    planSource: args.platform,
    planCancelled: false,
    purchaseDate,
    planExpiresAt: expiresAt,
    planRenewsAt: expiresAt,
    planOverrideSource: null,
    planOverrideAt: null,
  } as const;

  try {
    await syncUserPlanPublicMetadata(args.userId, patch);
  } catch (firstErr) {
    const fallbackId = args.supabaseAuthUserId?.trim();
    if (fallbackId && fallbackId !== args.userId) {
      await syncUserPlanPublicMetadata(fallbackId, patch);
    } else {
      throw firstErr;
    }
  }

  const supabaseAdminTarget =
    args.supabaseAuthUserId?.trim() ||
    (isLikelySupabaseAuthUserId(args.userId) ? args.userId : null);

  if (
    args.platform === "google_play" &&
    args.purchaseToken &&
    args.packageName &&
    supabaseAdminTarget
  ) {
    await trackGooglePlayPurchaseToken({
      supabaseAuthUserId: supabaseAdminTarget,
      purchaseToken: args.purchaseToken,
      subscriptionId: args.productId.split("|")[0] || args.productId,
      packageName: args.packageName,
      plan,
    });
  }

  logger.info("Updated plan from verified mobile purchase", {
    component: "mobile_iap",
    userId: args.userId,
    metadata: {
      platform: args.platform,
      productId: args.productId,
      plan,
      planType,
    },
  });

  return { plan };
}
