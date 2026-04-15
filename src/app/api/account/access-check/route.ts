import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { evaluateDeviceAccessWithClerk } from "@/lib/accountDeviceAccess";
import { canUseStripeDeviceSeatBilling } from "@/lib/accountDeviceBilling";
import {
  getActiveDeletedDeviceRestriction,
  getStableDeviceKeyFromSession,
} from "@/lib/accountDeviceRestriction";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { captureException } from "@/lib/sentry-logger";

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(req);
    const userId = authContext?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = authContext?.user;
    const plan = user?.publicMetadata?.plan as string | undefined;
    const purchaseDate = user?.publicMetadata?.purchaseDate as string | undefined;

    if (!hasPaidPracticeAccess(plan, purchaseDate)) {
      return NextResponse.json({ allowed: true, skipped: true as const });
    }

    if (process.env.DISABLE_ACCOUNT_SHARING_GUARD === "true") {
      return NextResponse.json({ allowed: true, skipped: true as const });
    }

    if (authContext?.sessionId) {
      try {
        const clerk = await clerkClient();
        const currentSession = await clerk.sessions.getSession(authContext.sessionId);
        const deviceKey = getStableDeviceKeyFromSession(currentSession);
        if (deviceKey) {
          const activeRestriction = await getActiveDeletedDeviceRestriction({
            userId,
            deviceKey,
          });
          if (activeRestriction) {
            return NextResponse.json({
              allowed: false,
              code: "DEVICE_RESTRICTED_48H",
              reason:
                "This device was removed from your active sessions. You can sign in again on this device after 48 hours.",
              restrictedUntil: activeRestriction.expiresAt.toISOString(),
            });
          }
        }
      } catch (error) {
        captureException(error, {
          component: "api",
          action: "account_access_check_device_restriction_lookup_failed",
          userId,
        });
      }
    }

    const deviceCheck = await evaluateDeviceAccessWithClerk({
      userId,
      currentSessionId: authContext?.sessionId,
      publicMetadata: (user?.publicMetadata ?? {}) as Record<string, unknown>,
      currentPlan: plan ?? "premium",
    });
    if (!deviceCheck.allowed) {
      let allowAddDevice = false;
      try {
        allowAddDevice = await canUseStripeDeviceSeatBilling({ userId, user });
      } catch (error) {
        captureException(error, {
          component: "api",
          action: "account_access_check_allow_add_device_lookup_failed",
          userId,
        });
        allowAddDevice = false;
      }
      return NextResponse.json({
        allowed: false,
        code: deviceCheck.code,
        reason: deviceCheck.reason,
        allowAddDevice,
        activeDevices: deviceCheck.activeDevices,
        allowedDevices: deviceCheck.allowedDevices,
        needsExtraDevices: deviceCheck.needsExtraDevices,
        currentPlan: deviceCheck.currentPlan,
      });
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    captureException(error, {
      component: "api",
      action: "account_access_check",
    });
    return NextResponse.json({ allowed: true, skipped: true as const });
  }
}
