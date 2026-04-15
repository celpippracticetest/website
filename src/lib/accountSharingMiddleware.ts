import type { NextRequest } from "next/server";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { captureException, logger } from "@/lib/sentry-logger";

type JwtLikeMetadata = {
  plan?: string;
  purchaseDate?: string;
};

export function shouldEnforceAccountSharingSignals(
  req: NextRequest,
  userId: string | null | undefined,
  meta: JwtLikeMetadata | undefined,
): boolean {
  if (!userId) return false;
  if (process.env.DISABLE_ACCOUNT_SHARING_GUARD === "true") return false;
  if (!hasPaidPracticeAccess(meta?.plan, meta?.purchaseDate)) return false;

  const path = req.nextUrl.pathname;

  if (path.startsWith("/account-sharing-notice")) return false;
  if (path.startsWith("/sign-in") || path.startsWith("/sign-up")) return false;
  if (path.includes("webhook")) return false;
  if (path.startsWith("/api/account/access-check")) return false;
  if (path.startsWith("/api/account/devices/add-seat")) return false;
  if (path.startsWith("/api/stripe/") || path.startsWith("/api/paypal/")) return false;
  if (path.startsWith("/api/cms/") || path.startsWith("/api/admin/")) return false;
  if (path.startsWith("/api/blog/")) return false;
  if (path.startsWith("/api/cron/")) return false;
  if (path.startsWith("/api/indexnow/")) return false;
  if (path.startsWith("/api/analytics/")) return false;
  if (path.startsWith("/api/plans/")) return false;
  if (path.startsWith("/api/subscribe")) return false;
  if (path.startsWith("/api/lead-capture/")) return false;
  if (path.startsWith("/api/checkout_session")) return false;
  if (path.startsWith("/api/checkout/guest")) return false;
  if (path.startsWith("/monitoring")) return false;
  if (path.startsWith("/onboarding-survey")) return false;

  // Avoid blocking data APIs from overview pages; enforce only on page routes.
  if (path.startsWith("/api/")) return false;

  const dashboardPrefixes = [
    "/reading",
    "/writing",
    "/listening",
    "/speaking",
    "/plans",
    "/referral",
    "/learning",
    "/league",
    "/words",
    "/flow",
  ];
  for (const p of dashboardPrefixes) {
    if (path === p || path.startsWith(`${p}/`)) return true;
  }
  // Do not guard exam list/overview pages; only actual skill routes above.
  if (path === "/exams") return false;
  if (path === "/exam-overview") return false;
  if (path.startsWith("/exams/")) return false;

  return false;
}

export type AccountSharingMiddlewareResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      code?: string;
      allowAddDevice?: boolean;
      needsExtraDevices?: number;
      currentPlan?: string;
      allowedDevices?: number;
      activeDevices?: number;
    };

/**
 * Calls the Node route handler so MongoDB runs outside the proxy bundle.
 */
export async function runAccountSharingMiddlewareCheck(
  req: NextRequest,
): Promise<AccountSharingMiddlewareResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const cookie = req.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;

  const authz = req.headers.get("authorization");
  if (authz) headers["authorization"] = authz;

  for (const name of [
    "x-forwarded-for",
    "x-vercel-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-vercel-ip-country",
    "cf-ipcountry",
    "true-client-ip",
  ]) {
    const v = req.headers.get(name);
    if (v) headers[name] = v;
  }

  const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (vercelBypass) headers["x-vercel-protection-bypass"] = vercelBypass;

  try {
    const res = await fetch(`${req.nextUrl.origin}/api/account/access-check`, {
      method: "POST",
      headers,
    });

    if (!res.ok) {
      logger.error("account access-check HTTP error", {
        component: "proxy",
        action: "account_sharing_check",
        metadata: { status: res.status, path: req.nextUrl.pathname },
      });
      return { ok: true };
    }

    const data = (await res.json()) as {
      allowed?: boolean;
      reason?: string;
      code?: string;
      allowAddDevice?: boolean;
      needsExtraDevices?: number;
      currentPlan?: string;
      allowedDevices?: number;
      activeDevices?: number;
    };

    if (data.allowed === false) {
      return {
        ok: false,
        reason: data.reason ?? "Access restricted.",
        code: data.code,
        allowAddDevice: data.allowAddDevice,
        needsExtraDevices: data.needsExtraDevices,
        currentPlan: data.currentPlan,
        allowedDevices: data.allowedDevices,
        activeDevices: data.activeDevices,
      };
    }
    return { ok: true };
  } catch (error) {
    captureException(error, {
      component: "proxy",
      action: "account_sharing_check",
    });
    return { ok: true };
  }
}
