import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { requireAuthenticatedRequest } from "@/lib/auth/request-auth";
import { applyVerifiedMobileSubscriptionPlan } from "@/lib/mobile/applyVerifiedMobileSubscriptionPlan";
import { captureException, logger } from "@/lib/sentry-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  productId?: string;
  purchaseToken?: string;
  packageName?: string;
};

function getExpectedPackageName(): string | null {
  const v = process.env.GOOGLE_PLAY_EXPECTED_PACKAGE_NAME?.trim();
  return v && v.length > 0 ? v : null;
}

export function getGooglePlayServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function buildAndroidPublisherAuth(credentials: Record<string, unknown>) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  return google.androidpublisher({ version: "v3", auth });
}

type SubscriptionState =
  | "SUBSCRIPTION_STATE_ACTIVE"
  | "SUBSCRIPTION_STATE_CANCELED"
  | "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
  | "SUBSCRIPTION_STATE_ON_HOLD"
  | "SUBSCRIPTION_STATE_PAUSED"
  | "SUBSCRIPTION_STATE_EXPIRED"
  | string;

const ACTIVE_SUBSCRIPTION_STATES: SubscriptionState[] = [
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_ON_HOLD",
];

function productIdFromV2LineItems(
  lineItems: {
    productId?: string | null;
    offerDetails?: { basePlanId?: string | null } | null;
  }[],
  fallback: string
): string {
  const item = lineItems[0];
  const subId = item?.productId?.trim();
  const basePlan = item?.offerDetails?.basePlanId?.trim();
  if (subId && basePlan) return `${subId}|${basePlan}`;
  if (subId) return subId;
  return fallback;
}

/** Returns the latest expiry ISO string across all line items, or null if none found. */
function getLatestExpiryFromV2(lineItems: { expiryTime?: string | null }[]): string | null {
  let latest: Date | null = null;
  for (const item of lineItems) {
    if (!item.expiryTime) continue;
    const d = new Date(item.expiryTime);
    if (!Number.isNaN(d.getTime()) && (!latest || d > latest)) {
      latest = d;
    }
  }
  return latest ? latest.toISOString() : null;
}

/**
 * Verifies a Play subscription purchase using the subscriptionsv2 API
 * (required for multi-base-plan subscriptions introduced in Play Billing Library 5+),
 * then writes `plan` to the user's auth metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuthenticatedRequest(request);
    const credentials = getGooglePlayServiceAccountJson();
    if (!credentials) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Server is not configured for Google Play verification (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON).",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Body;
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const purchaseToken =
      typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : "";
    const packageName =
      typeof body.packageName === "string" ? body.packageName.trim() : "";

    if (!productId || !purchaseToken || !packageName) {
      return NextResponse.json(
        { ok: false, message: "productId, purchaseToken, and packageName are required." },
        { status: 400 }
      );
    }

    const expected = getExpectedPackageName();
    if (expected) {
      const allowed = expected
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(packageName)) {
        return NextResponse.json(
          { ok: false, message: "packageName does not match configured app." },
          { status: 400 }
        );
      }
    }

    const androidpublisher = buildAndroidPublisherAuth(credentials);

    const { data } = await androidpublisher.purchases.subscriptionsv2.get({
      packageName,
      token: purchaseToken,
    });

    const state = data.subscriptionState as SubscriptionState | undefined;
    if (!state || !ACTIVE_SUBSCRIPTION_STATES.includes(state)) {
      logger.warn("Google Play subscription not in active state", {
        component: "mobile_iap_google",
        userId: ctx.userId,
        metadata: { subscriptionState: state, productId },
      });
      return NextResponse.json(
        {
          ok: false,
          message: `Subscription is not active (state: ${state ?? "unknown"}).`,
        },
        { status: 400 }
      );
    }

    const lineItems = data.lineItems ?? [];
    const playProductId = productIdFromV2LineItems(lineItems, productId);
    const expiryIso = getLatestExpiryFromV2(lineItems);
    if (expiryIso) {
      const expiryMs = new Date(expiryIso).getTime();
      if (
        state === "SUBSCRIPTION_STATE_EXPIRED" ||
        (state !== "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" && expiryMs < Date.now())
      ) {
        return NextResponse.json(
          { ok: false, message: "Subscription has expired." },
          { status: 400 }
        );
      }
    }

    await applyVerifiedMobileSubscriptionPlan({
      userId: ctx.userId,
      supabaseAuthUserId: ctx.supabaseAuthUserId,
      productId: playProductId,
      platform: "google_play",
      purchaseToken,
      packageName,
      expiresAtIso: expiryIso,
    });

    return NextResponse.json({ ok: true, message: null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "Unauthorized") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    captureException(e, { component: "mobile_iap_google", action: "verify" });
    return NextResponse.json({ ok: false, message: msg || "Verification failed" }, { status: 500 });
  }
}
