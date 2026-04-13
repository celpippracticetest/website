import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { evaluateAccountSharingAccess } from "@/lib/accountSharingSignals";
import { getRequestCountry, getTrustedClientIp } from "@/lib/clientIpGeo";
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

    const ip = getTrustedClientIp(req);
    const country = getRequestCountry(req);
    const result = await evaluateAccountSharingAccess(userId, ip, country);
    return NextResponse.json(result);
  } catch (error) {
    captureException(error, {
      component: "api",
      action: "account_access_check",
    });
    return NextResponse.json({ allowed: true, skipped: true as const });
  }
}
