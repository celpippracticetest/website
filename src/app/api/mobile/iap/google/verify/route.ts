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

function getServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Verifies an existing Play subscription with the Android Publisher API,
 * then updates Clerk `publicMetadata.plan` (same values as Stripe web).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuthenticatedRequest(request);
    const credentials = getServiceAccountJson();
    if (!credentials) {
      return NextResponse.json(
        {
          ok: false,
          message: "Server is not configured for Google Play verification (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON).",
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
    if (expected && packageName !== expected) {
      return NextResponse.json(
        { ok: false, message: "packageName does not match configured app." },
        { status: 400 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const androidpublisher = google.androidpublisher({ version: "v3", auth });
    const { data } = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId: productId,
      token: purchaseToken,
    });

    const expiryMs = data.expiryTimeMillis ? Number(data.expiryTimeMillis) : 0;
    if (!expiryMs || Number.isNaN(expiryMs) || expiryMs < Date.now()) {
      return NextResponse.json(
        { ok: false, message: "Subscription is not active or has expired." },
        { status: 400 }
      );
    }

    const paymentState = data.paymentState;
    if (paymentState !== undefined && paymentState !== 1 && paymentState !== 2) {
      logger.warn("Google subscription unexpected paymentState", {
        component: "mobile_iap_google",
        userId: ctx.userId,
        metadata: { paymentState },
      });
    }

    await applyVerifiedMobileSubscriptionPlan({
      userId: ctx.userId,
      productId,
      platform: "google_play",
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
