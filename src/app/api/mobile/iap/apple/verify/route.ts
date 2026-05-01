import { NextRequest, NextResponse } from "next/server";
import {
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";
import { requireAuthenticatedRequest } from "@/lib/auth/request-auth";
import { applyVerifiedMobileSubscriptionPlan } from "@/lib/mobile/applyVerifiedMobileSubscriptionPlan";
import { captureException } from "@/lib/sentry-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  signedTransactionJws?: string;
};

function loadAppleRootCerts(): Buffer[] | null {
  const raw = process.env.APPLE_IAP_ROOT_CA_BASE64?.trim();
  if (!raw) return null;
  try {
    const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    return parts.map((b64) => Buffer.from(b64, "base64"));
  } catch {
    return null;
  }
}

/**
 * Verifies StoreKit signed transaction JWS from the device, then updates Clerk `publicMetadata.plan`.
 *
 * Configure:
 * - `APPLE_IAP_ROOT_CA_BASE64` — one or more Apple root CA certs in DER, base64-encoded, `|` separated (see Apple PKI).
 * - `APPLE_APP_BUNDLE_ID` — must match the app that issued the transaction.
 * - `APPLE_APP_STORE_ENV` — `sandbox` or `production` (defaults to `production`).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuthenticatedRequest(request);
    const roots = loadAppleRootCerts();
    const bundleId = process.env.APPLE_APP_BUNDLE_ID?.trim();
    const envRaw = (process.env.APPLE_APP_STORE_ENV || "production").trim().toLowerCase();
    const environment =
      envRaw === "sandbox" ? Environment.SANDBOX : Environment.PRODUCTION;

    if (!roots?.length || !bundleId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Apple IAP verification is not configured (APPLE_IAP_ROOT_CA_BASE64, APPLE_APP_BUNDLE_ID).",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Body;
    const jws =
      typeof body.signedTransactionJws === "string"
        ? body.signedTransactionJws.trim()
        : "";
    if (!jws) {
      return NextResponse.json(
        { ok: false, message: "signedTransactionJws is required." },
        { status: 400 }
      );
    }

    const appAppleIdRaw = process.env.APPLE_APP_APPLE_ID?.trim();
    const appAppleId =
      appAppleIdRaw && !Number.isNaN(Number(appAppleIdRaw))
        ? Number(appAppleIdRaw)
        : undefined;

    const verifier = new SignedDataVerifier(
      roots,
      true,
      environment,
      bundleId,
      environment === Environment.PRODUCTION ? appAppleId : undefined
    );

    const decoded = await verifier.verifyAndDecodeTransaction(jws);
    const productId = decoded.productId?.trim();
    if (!productId) {
      return NextResponse.json(
        { ok: false, message: "Verified transaction did not include productId." },
        { status: 400 }
      );
    }

    const expires = decoded.expiresDate;
    if (typeof expires === "number" && expires < Date.now()) {
      return NextResponse.json(
        { ok: false, message: "Subscription has expired." },
        { status: 400 }
      );
    }

    await applyVerifiedMobileSubscriptionPlan({
      userId: ctx.userId,
      productId,
      platform: "apple",
    });

    return NextResponse.json({ ok: true, message: null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "Unauthorized") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    captureException(e, { component: "mobile_iap_apple", action: "verify" });
    return NextResponse.json({ ok: false, message: msg || "Verification failed" }, { status: 500 });
  }
}
