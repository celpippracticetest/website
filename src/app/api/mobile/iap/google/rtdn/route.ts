import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { captureException, logger } from "@/lib/sentry-logger";
import {
  buildAndroidPublisherAuth,
  getGooglePlayServiceAccountJson,
} from "@/app/api/mobile/iap/google/verify/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Google Play RTDN notification types for subscriptions.
 * https://developer.android.com/google/play/billing/rtdn-reference
 */
const enum SubscriptionNotificationType {
  RECOVERED = 1,
  RENEWED = 2,
  CANCELED = 3,
  PURCHASED = 4,
  ON_HOLD = 5,
  IN_GRACE_PERIOD = 6,
  RESTARTED = 7,
  PRICE_CHANGE_CONFIRMED = 8,
  DEFERRED = 9,
  PAUSED = 10,
  PAUSE_SCHEDULE_CHANGED = 11,
  REVOKED = 12,
  EXPIRED = 13,
}

/** Notification types that indicate the subscription should be active. */
const ACTIVE_NOTIFICATION_TYPES = new Set([
  SubscriptionNotificationType.RECOVERED,
  SubscriptionNotificationType.RENEWED,
  SubscriptionNotificationType.PURCHASED,
  SubscriptionNotificationType.IN_GRACE_PERIOD,
  SubscriptionNotificationType.RESTARTED,
]);

/** Notification types that indicate the subscription should be revoked immediately. */
const REVOKE_NOTIFICATION_TYPES = new Set([
  SubscriptionNotificationType.REVOKED,
  SubscriptionNotificationType.EXPIRED,
]);

type PubSubMessage = {
  data?: string;
  messageId?: string;
  publishTime?: string;
};

type PubSubBody = {
  message?: PubSubMessage;
  subscription?: string;
};

type DeveloperNotification = {
  version?: string;
  packageName?: string;
  eventTimeMillis?: string;
  subscriptionNotification?: {
    version?: string;
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
};

function getWebhookToken(): string | null {
  const v = process.env.GOOGLE_PLAY_RTDN_TOKEN?.trim();
  return v && v.length > 0 ? v : null;
}

async function downgradeUserPlan(supabaseUserId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin not configured.");

  const { data: existing, error: getErr } =
    await admin.auth.admin.getUserById(supabaseUserId);
  if (getErr || !existing.user) {
    throw new Error(getErr?.message || "Supabase user not found.");
  }

  const currentApp = (existing.user.app_metadata ?? {}) as Record<
    string,
    unknown
  >;
  await admin.auth.admin.updateUserById(supabaseUserId, {
    app_metadata: {
      ...currentApp,
      plan: "free",
      planSource: "google_play_rtdn",
      planCancelled: true,
    },
  });
}

async function reactivateUserPlan(
  supabaseUserId: string,
  plan: string
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin not configured.");

  const { data: existing, error: getErr } =
    await admin.auth.admin.getUserById(supabaseUserId);
  if (getErr || !existing.user) {
    throw new Error(getErr?.message || "Supabase user not found.");
  }

  const currentApp = (existing.user.app_metadata ?? {}) as Record<
    string,
    unknown
  >;
  await admin.auth.admin.updateUserById(supabaseUserId, {
    app_metadata: {
      ...currentApp,
      plan,
      planSource: "google_play_rtdn",
      planCancelled: false,
    },
  });
}

/**
 * Google Play Real-Time Developer Notifications (RTDN) webhook.
 *
 * Set up in Play Console → Monetize → Monetization setup → Real-time developer notifications.
 * Point to: POST /api/mobile/iap/google/rtdn?token=<GOOGLE_PLAY_RTDN_TOKEN>
 *
 * The Pub/Sub push subscription must use this URL. Set GOOGLE_PLAY_RTDN_TOKEN to a random
 * secret and use it as the query param to authenticate incoming requests.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the shared secret token to authenticate the Pub/Sub push.
    const expectedToken = getWebhookToken();
    if (expectedToken) {
      const incoming = request.nextUrl.searchParams.get("token")?.trim();
      if (incoming !== expectedToken) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const body = (await request.json()) as PubSubBody;
    const encoded = body.message?.data;
    if (!encoded) {
      // Acknowledge with 200 so Pub/Sub stops retrying for malformed messages.
      return NextResponse.json({ ok: true });
    }

    let notification: DeveloperNotification;
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      notification = JSON.parse(decoded) as DeveloperNotification;
    } catch {
      logger.warn("RTDN: failed to decode Pub/Sub message", {
        component: "mobile_rtdn_google",
      });
      return NextResponse.json({ ok: true });
    }

    const sub = notification.subscriptionNotification;
    if (!sub) {
      // Could be a test notification or one-time product — ignore.
      return NextResponse.json({ ok: true });
    }

    const { notificationType, purchaseToken, subscriptionId } = sub;
    const packageName = notification.packageName;

    if (!purchaseToken || !subscriptionId || !packageName || notificationType === undefined) {
      return NextResponse.json({ ok: true });
    }

    logger.info("RTDN notification received", {
      component: "mobile_rtdn_google",
      metadata: { notificationType, subscriptionId, packageName },
    });

    const admin = getSupabaseAdmin();
    if (!admin) {
      logger.warn("RTDN: Supabase admin not configured, skipping", {
        component: "mobile_rtdn_google",
      });
      return NextResponse.json({ ok: true });
    }

    // Look up the Supabase user who owns this purchase token.
    const { data: row, error: lookupErr } = await admin
      .from("google_play_subscriptions")
      .select("supabase_user_id, plan")
      .eq("purchase_token", purchaseToken)
      .maybeSingle();

    if (lookupErr) {
      logger.warn("RTDN: purchase token lookup failed", {
        component: "mobile_rtdn_google",
        metadata: { error: lookupErr.message, subscriptionId },
      });
      return NextResponse.json({ ok: true });
    }

    if (!row) {
      // Purchase token not yet registered (e.g. purchased via web or before this feature shipped).
      logger.info("RTDN: purchase token not found in DB, skipping", {
        component: "mobile_rtdn_google",
        metadata: { subscriptionId },
      });
      return NextResponse.json({ ok: true });
    }

    const supabaseUserId = row.supabase_user_id as string;
    const trackedPlan = (row.plan as string | null) ?? "premium";

    if (REVOKE_NOTIFICATION_TYPES.has(notificationType)) {
      await downgradeUserPlan(supabaseUserId);
      logger.info("RTDN: plan downgraded to free", {
        component: "mobile_rtdn_google",
        userId: supabaseUserId,
        metadata: { notificationType, subscriptionId },
      });
      return NextResponse.json({ ok: true });
    }

    if (ACTIVE_NOTIFICATION_TYPES.has(notificationType)) {
      // For renewals, verify with Play API to confirm the subscription is still valid.
      const credentials = getGooglePlayServiceAccountJson();
      if (credentials) {
        try {
          const androidpublisher = buildAndroidPublisherAuth(credentials);
          const { data: purchase } =
            await androidpublisher.purchases.subscriptionsv2.get({
              packageName,
              token: purchaseToken,
            });

          const state = purchase.subscriptionState ?? "";
          const activeStates = [
            "SUBSCRIPTION_STATE_ACTIVE",
            "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
            "SUBSCRIPTION_STATE_ON_HOLD",
          ];

          if (!activeStates.includes(state)) {
            await downgradeUserPlan(supabaseUserId);
            logger.info("RTDN: renewal verify rejected — downgrading", {
              component: "mobile_rtdn_google",
              userId: supabaseUserId,
              metadata: { state, notificationType },
            });
            return NextResponse.json({ ok: true });
          }
        } catch (verifyErr) {
          logger.warn("RTDN: Play API verify failed during renewal, keeping plan", {
            component: "mobile_rtdn_google",
            userId: supabaseUserId,
            metadata: { error: String(verifyErr) },
          });
        }
      }

      await reactivateUserPlan(supabaseUserId, trackedPlan);
      logger.info("RTDN: plan reactivated", {
        component: "mobile_rtdn_google",
        userId: supabaseUserId,
        metadata: { notificationType, subscriptionId, plan: trackedPlan },
      });
      return NextResponse.json({ ok: true });
    }

    // CANCELED (3), ON_HOLD (5), PAUSED (10), etc. — note it but don't
    // revoke access yet; wait for EXPIRED or REVOKED.
    logger.info("RTDN: informational notification, no plan change", {
      component: "mobile_rtdn_google",
      metadata: { notificationType, subscriptionId },
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    captureException(e, { component: "mobile_rtdn_google", action: "post" });
    // Return 200 so Pub/Sub does not retry indefinitely on server errors.
    return NextResponse.json({ ok: true });
  }
}
