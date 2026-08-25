import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { findUserProfileForAdminLookup } from "@/lib/users/userProfilesPg";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";
import {
  buildAndroidPublisherAuth,
  getGooglePlayServiceAccountJson,
} from "@/app/api/mobile/iap/google/verify/route";

export type GooglePlayTrackedSubscription = {
  purchaseToken: string;
  subscriptionId: string;
  packageName: string;
  plan: string | null;
  supabaseUserId: string;
};

export function readPlanSource(meta: Record<string, unknown> | null | undefined): string | null {
  const raw = meta?.planSource ?? meta?.plan_source;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function planSourceIsGooglePlay(source: unknown): boolean {
  return String(source ?? "")
    .trim()
    .toLowerCase()
    .startsWith("google_play");
}

export function planSourceIsApple(source: unknown): boolean {
  return String(source ?? "")
    .trim()
    .toLowerCase()
    .startsWith("apple");
}

export function planSourceIsStripe(source: unknown): boolean {
  return String(source ?? "")
    .trim()
    .toLowerCase()
    .startsWith("stripe");
}

async function resolveSupabaseAuthUserId(userId: string): Promise<string | null> {
  const id = userId.trim();
  if (!id) return null;
  if (isLikelySupabaseAuthUserId(id)) return id;
  const profile = await findUserProfileForAdminLookup(id);
  const fromProfile = profile?.supabase_auth_user_id?.trim();
  if (fromProfile && isLikelySupabaseAuthUserId(fromProfile)) {
    return fromProfile;
  }
  return null;
}

export async function listGooglePlaySubscriptionsForUser(
  userId: string
): Promise<GooglePlayTrackedSubscription[]> {
  const supabaseUserId = await resolveSupabaseAuthUserId(userId);
  if (!supabaseUserId) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("google_play_subscriptions")
    .select(
      "purchase_token, subscription_id, package_name, plan, supabase_user_id, updated_at"
    )
    .eq("supabase_user_id", supabaseUserId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data
    .map((row) => {
      const purchaseToken = String(row.purchase_token ?? "").trim();
      const subscriptionId = String(row.subscription_id ?? "").trim();
      const packageName = String(row.package_name ?? "").trim();
      const uid = String(row.supabase_user_id ?? "").trim();
      if (!purchaseToken || !subscriptionId || !packageName || !uid) return null;
      return {
        purchaseToken,
        subscriptionId: subscriptionId.split("|")[0] || subscriptionId,
        packageName,
        plan: typeof row.plan === "string" ? row.plan : null,
        supabaseUserId: uid,
      } satisfies GooglePlayTrackedSubscription;
    })
    .filter((row): row is GooglePlayTrackedSubscription => Boolean(row));
}

export async function googlePlayUserIdsForAuthIds(
  supabaseAuthUserIds: string[]
): Promise<Set<string>> {
  const ids = [
    ...new Set(supabaseAuthUserIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (ids.length === 0) return new Set();
  const admin = getSupabaseAdmin();
  if (!admin) return new Set();

  const { data, error } = await admin
    .from("google_play_subscriptions")
    .select("supabase_user_id")
    .in("supabase_user_id", ids);

  if (error || !data) return new Set();
  return new Set(
    data
      .map((row) => String(row.supabase_user_id ?? "").trim())
      .filter(Boolean)
  );
}

function playApiErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const data = (err as { response?: { data?: { error?: { message?: string } } } })
      .response?.data?.error?.message;
    if (typeof data === "string" && data.trim()) return data.trim();
  }
  return err instanceof Error
    ? err.message
    : "Google Play could not complete this request.";
}

function isAlreadyCanceledPlayError(err: unknown): boolean {
  const msg = playApiErrorMessage(err);
  return /already.?cancel|already.?revok|already.?refund|410|404|not active/i.test(
    msg
  );
}

export async function cancelGooglePlaySubscriptionForAdmin(args: {
  userId: string;
  revokeAccess: boolean;
}): Promise<{
  playCanceled: boolean;
  tokensCanceled: number;
  message: string;
}> {
  const rows = await listGooglePlaySubscriptionsForUser(args.userId);
  const credentials = getGooglePlayServiceAccountJson();
  if (!credentials && rows.length > 0) {
    throw new Error(
      "Google Play API is not configured (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)."
    );
  }

  let tokensCanceled = 0;
  if (credentials && rows.length > 0) {
    const androidpublisher = buildAndroidPublisherAuth(credentials);
    for (const row of rows) {
      try {
        await androidpublisher.purchases.subscriptions.cancel({
          packageName: row.packageName,
          subscriptionId: row.subscriptionId,
          token: row.purchaseToken,
        });
        tokensCanceled += 1;
      } catch (err) {
        if (isAlreadyCanceledPlayError(err)) {
          tokensCanceled += 1;
          continue;
        }
        throw new Error(
          playApiErrorMessage(err) ||
            "Google Play could not cancel this subscription."
        );
      }
    }
  }

  const metadataUserId =
    rows[0]?.supabaseUserId ||
    (await resolveSupabaseAuthUserId(args.userId)) ||
    args.userId;

  if (args.revokeAccess) {
    await syncUserPlanPublicMetadata(metadataUserId, {
      plan: "free",
      planSource: "google_play",
      planCancelled: true,
    });
  } else {
    await syncUserPlanPublicMetadata(metadataUserId, {
      planSource: "google_play",
      planCancelled: true,
    });
  }

  if (rows.length === 0) {
    return {
      playCanceled: false,
      tokensCanceled: 0,
      message: args.revokeAccess
        ? "No Play purchase token on file. App access was revoked."
        : "No Play purchase token on file. The account was marked canceled in the app. Google Play auto-renew could not be stopped.",
    };
  }

  return {
    playCanceled: tokensCanceled > 0,
    tokensCanceled,
    message: args.revokeAccess
      ? "Google Play auto-renew was canceled and app access was revoked."
      : "Google Play auto-renew was canceled. The user keeps access until the current period ends.",
  };
}

/**
 * Refunds the latest Play subscription charge and immediately revokes access.
 * Uses Play `subscriptions.revoke` (refund + terminate). Falls back to
 * `refund` + `cancel` if revoke is not available for that purchase.
 */
export async function refundGooglePlaySubscriptionForAdmin(args: {
  userId: string;
}): Promise<{
  playRefunded: boolean;
  tokensRefunded: number;
  message: string;
}> {
  const rows = await listGooglePlaySubscriptionsForUser(args.userId);
  if (rows.length === 0) {
    throw new Error(
      "No Google Play purchase token on file for this user. Refund in Play Console Order management instead."
    );
  }

  const credentials = getGooglePlayServiceAccountJson();
  if (!credentials) {
    throw new Error(
      "Google Play API is not configured (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)."
    );
  }

  const androidpublisher = buildAndroidPublisherAuth(credentials);
  let tokensRefunded = 0;

  for (const row of rows) {
    try {
      await androidpublisher.purchases.subscriptions.revoke({
        packageName: row.packageName,
        subscriptionId: row.subscriptionId,
        token: row.purchaseToken,
      });
      tokensRefunded += 1;
    } catch (revokeErr) {
      if (isAlreadyCanceledPlayError(revokeErr)) {
        tokensRefunded += 1;
        continue;
      }
      try {
        await androidpublisher.purchases.subscriptions.refund({
          packageName: row.packageName,
          subscriptionId: row.subscriptionId,
          token: row.purchaseToken,
        });
        try {
          await androidpublisher.purchases.subscriptions.cancel({
            packageName: row.packageName,
            subscriptionId: row.subscriptionId,
            token: row.purchaseToken,
          });
        } catch (cancelErr) {
          if (!isAlreadyCanceledPlayError(cancelErr)) {
            // Refund succeeded; cancel is best-effort.
          }
        }
        tokensRefunded += 1;
      } catch (refundErr) {
        throw new Error(playApiErrorMessage(refundErr) || playApiErrorMessage(revokeErr));
      }
    }
  }

  const metadataUserId =
    rows[0]?.supabaseUserId ||
    (await resolveSupabaseAuthUserId(args.userId)) ||
    args.userId;

  await syncUserPlanPublicMetadata(metadataUserId, {
    plan: "free",
    planSource: "google_play",
    planCancelled: true,
  });

  return {
    playRefunded: tokensRefunded > 0,
    tokensRefunded,
    message:
      "Google Play charge was refunded and app access was revoked. The buyer should see the refund in Play Store.",
  };
}
