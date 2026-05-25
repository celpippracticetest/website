import { ensureAdminApi } from "@/lib/auth/ensure-admin-api";
import {
  parseSignupPeriod,
  SIGNUP_PERIOD_LABELS,
} from "@/lib/admin/free-user-email-config";
import { getFreeUserEmailAudience } from "@/lib/admin/free-user-email-audience";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await ensureAdminApi(request);
    if (!admin.ok) return admin.response;

    const period = parseSignupPeriod(new URL(request.url).searchParams.get("period"));
    if (!period) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid period. Use last_3_days, last_7_days, or last_30_days.",
        },
        { status: 400 }
      );
    }

    const audience = await getFreeUserEmailAudience(period);

    return NextResponse.json({
      ok: true,
      data: {
        ...audience,
        periodLabel: SIGNUP_PERIOD_LABELS[period],
      },
    });
  } catch (error) {
    console.error("[admin user-emails audience] failed:", error);
    const message = error instanceof Error ? error.message : "Failed to load audience.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
