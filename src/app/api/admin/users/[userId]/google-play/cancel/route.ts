import { NextRequest, NextResponse } from "next/server";
import {
  auth,
  currentUser,
  sessionClaimsHasAdminRole,
} from "@/lib/auth/server-auth";
import { cancelGooglePlaySubscriptionForAdmin } from "@/lib/admin/googlePlayAdmin";
import { captureException } from "@/lib/sentry-logger";

export async function POST(
  request: NextRequest,
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

    const body = await request.json().catch(() => ({}));
    const revokeAccess = Boolean(body?.revokeAccess);

    const result = await cancelGooglePlaySubscriptionForAdmin({
      userId,
      revokeAccess,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    captureException(error, {
      component: "admin_google_play_cancel",
      action: "post",
      userId,
    });
    const message =
      error instanceof Error
        ? error.message
        : "Failed to cancel Google Play subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
