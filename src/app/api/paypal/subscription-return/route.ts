import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/server-auth";
import { getRequestOriginFromHeaders } from "@/lib/requestOrigin";
import { paypalSubscriptionsConfigured } from "@/lib/paypal/config";
import { finalizePayPalSubscriptionReturn } from "@/lib/paypal/finalizeSubscriptionReturn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = await getRequestOriginFromHeaders();

  if (!paypalSubscriptionsConfigured()) {
    return NextResponse.redirect(new URL("/pricing?paypal=unavailable", origin), 302);
  }

  const subscriptionId = req.nextUrl.searchParams.get("subscription_id")?.trim() || "";

  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.redirect(
      new URL("/pricing?paypal=sign_in_required", origin),
      302
    );
  }

  const result = await finalizePayPalSubscriptionReturn({
    webUserId: user.id,
    subscriptionId,
  });

  if (result.ok) {
    return NextResponse.redirect(
      new URL(
        `/success/paypal?subscription_id=${encodeURIComponent(subscriptionId)}`,
        origin
      ),
      302
    );
  }

  const q =
    result.reason === "not_active"
      ? "paypal=pending"
      : result.reason === "pending_mismatch" || result.reason === "missing_custom_id"
        ? "paypal=invalid"
        : "paypal=error";

  return NextResponse.redirect(new URL(`/pricing?${q}`, origin), 302);
}
