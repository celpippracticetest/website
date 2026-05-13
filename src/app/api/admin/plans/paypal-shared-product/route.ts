import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import { paypalApiCredentialsConfigured } from "@/lib/paypal/config";
import { resolveOrCreateSharedPayPalCatalogProductId } from "@/lib/paypal/billingPlans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!paypalApiCredentialsConfigured()) {
      return NextResponse.json(
        {
          error:
            "PayPal API credentials are not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)",
        },
        { status: 503 }
      );
    }

    const paypalProductId = await resolveOrCreateSharedPayPalCatalogProductId();
    return NextResponse.json({ success: true, paypalProductId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

