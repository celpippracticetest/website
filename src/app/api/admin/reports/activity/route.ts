import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { getActivityReport } from "@/lib/admin/activityReport";

export const maxDuration = 120;

function parseDateParam(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function GET(request: NextRequest) {
  try {
    const currentUserData = await currentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authenticate = await auth();
    const isAdmin = sessionClaimsHasAdminRole(authenticate.sessionClaims);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 30);
    defaultStart.setUTCHours(0, 0, 0, 0);

    const startDate = parseDateParam(searchParams.get("startDate"), defaultStart);
    const endDate = parseDateParam(searchParams.get("endDate"), now);
    const topLimit = Math.min(
      Math.max(parseInt(searchParams.get("topLimit") || "25", 10) || 25, 1),
      100
    );

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "startDate must be before endDate" },
        { status: 400 }
      );
    }

    const report = await getActivityReport({ startDate, endDate, topLimit });
    return NextResponse.json(report);
  } catch (error) {
    console.error("[admin/reports/activity]", error);
    return NextResponse.json(
      { error: "Failed to load activity report" },
      { status: 500 }
    );
  }
}
