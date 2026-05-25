import "server-only";

import {
  buildAndroidPublisherAuth,
  getGooglePlayServiceAccountJson,
} from "@/app/api/mobile/iap/google/verify/route";
import documentsClient from "@/lib/appDocumentsClient";
import { getSql } from "@/lib/pg/pool";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/sentry-logger";
import { matchUsersCollectionByWebUserIds } from "@/lib/users/userDocumentIdentity";

export type GooglePlaySubscriptionRow = {
  purchase_token: string;
  supabase_user_id: string;
  subscription_id: string;
  package_name: string;
  plan: string;
};

export async function findGooglePlaySubscriptionForUser(
  supabaseAuthUserId: string
): Promise<GooglePlaySubscriptionRow | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("google_play_subscriptions")
    .select("purchase_token, supabase_user_id, subscription_id, package_name, plan")
    .eq("supabase_user_id", supabaseAuthUserId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as GooglePlaySubscriptionRow;
}

export async function syncUserProfilePlan(
  supabaseAuthUserId: string,
  plan: string
): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      UPDATE public.user_profiles
      SET plan = ${plan}, updated_at = NOW()
      WHERE supabase_auth_user_id = ${supabaseAuthUserId}::uuid
    `;
  } catch (e) {
    logger.warn("Failed to sync user_profiles plan after Google Play event", {
      component: "mobile_google_play",
      userId: supabaseAuthUserId,
      metadata: { plan, error: String(e) },
    });
  }
}

async function syncUserDocumentCancellation(args: {
  userId: string;
  subscriptionCancelledAt: string;
}): Promise<void> {
  if (!documentsClient) return;
  try {
    const db = documentsClient.db();
    await db.collection("users").updateOne(
      matchUsersCollectionByWebUserIds(args.userId),
      {
        $set: {
          planCancelled: true,
          subscriptionCancelledAt: args.subscriptionCancelledAt,
          updatedAt: new Date(),
        },
      }
    );
  } catch (e) {
    logger.warn("User document cancellation sync skipped or failed", {
      component: "mobile_google_play",
      userId: args.userId,
      metadata: { error: String(e) },
    });
  }
}

/**
 * Cancels a Google Play subscription at period end and marks the user as cancelled
 * in Supabase auth metadata, Postgres user_profiles, and the legacy users document.
 */
export async function cancelGooglePlaySubscriptionForUser(args: {
  supabaseAuthUserId: string;
  userId: string;
}): Promise<void> {
  const row = await findGooglePlaySubscriptionForUser(args.supabaseAuthUserId);
  if (!row) {
    throw new Error("No Google Play subscription found for this account.");
  }

  const credentials = getGooglePlayServiceAccountJson();
  if (!credentials) {
    throw new Error(
      "Server is not configured for Google Play cancellation (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)."
    );
  }

  const androidpublisher = buildAndroidPublisherAuth(credentials);
  await androidpublisher.purchases.subscriptions.cancel({
    packageName: row.package_name,
    subscriptionId: row.subscription_id,
    token: row.purchase_token,
  });

  const now = new Date();
  const nowIso = now.toISOString();
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data: existing, error: getErr } = await admin.auth.admin.getUserById(
    args.supabaseAuthUserId
  );
  if (getErr || !existing.user) {
    throw new Error(getErr?.message || "Supabase user not found.");
  }

  const currentApp = (existing.user.app_metadata ?? {}) as Record<string, unknown>;
  await admin.auth.admin.updateUserById(args.supabaseAuthUserId, {
    app_metadata: {
      ...currentApp,
      planCancelled: true,
      subscriptionCancelledAt: nowIso,
      planSource: "google_play",
    },
  });

  await syncUserProfilePlan(args.supabaseAuthUserId, row.plan || "plus");
  await syncUserDocumentCancellation({
    userId: args.userId,
    subscriptionCancelledAt: nowIso,
  });

  await admin
    .from("google_play_subscriptions")
    .update({ updated_at: nowIso })
    .eq("purchase_token", row.purchase_token);

  logger.info("Google Play subscription cancelled at period end", {
    component: "mobile_google_play",
    userId: args.userId,
    metadata: {
      supabaseAuthUserId: args.supabaseAuthUserId,
      subscriptionId: row.subscription_id,
    },
  });
}
