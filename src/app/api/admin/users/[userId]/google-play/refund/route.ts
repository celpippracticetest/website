import { NextRequest, NextResponse } from "next/server";
import {
  auth,
  currentUser,
  sessionClaimsHasAdminRole,
} from "@/lib/auth/server-auth";
import { refundGooglePlaySubscriptionForAdmin } from "@/lib/admin/googlePlayAdmin";
import { captureException } from "@/lib/sentry-logger";

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  const { userId } = await props.params;
  try {
    const currentUserData = await currentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authenticate = await auth();
    if (!sessionClaimsHasAdminRole(authenticate.sessionClaims)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await refundGooglePlaySubscriptionForAdmin({ userId });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    captureException(error, {
      component: "admin_google_play_refund",
      action: "post",
      userId,
    });
    const message =
      error instanceof Error
        ? error.message
        : "Failed to refund Google Play subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
