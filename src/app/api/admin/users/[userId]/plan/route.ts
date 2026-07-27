import { NextRequest, NextResponse } from "next/server";
import {
  auth,
  currentUser,
  sessionClaimsHasAdminRole,
} from "@/lib/auth/server-auth";
import {
  adminChangeUserPlan,
  getAdminPlanChangeContext,
  type AdminPlanChangeTiming,
} from "@/lib/admin/adminChangeUserPlan";

export async function GET(
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

    const context = await getAdminPlanChangeContext(userId);
    return NextResponse.json(context);
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status: number }).status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load plan context";
    console.error("GET admin user plan context:", error);
    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}

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
    const timingRaw = String(body?.timing || "");
    const timing: AdminPlanChangeTiming =
      timingRaw === "period_end" ? "period_end" : "immediate";
    const refundLatestPayment = Boolean(body?.refundLatestPayment);
    const targetRaw = String(body?.target || body?.plan || "").trim();

    if (!targetRaw) {
      return NextResponse.json(
        { error: "Missing target plan (use \"free\" or a plan id)" },
        { status: 400 }
      );
    }

    const target =
      targetRaw === "free"
        ? ({ kind: "free" } as const)
        : ({ kind: "plan", planId: targetRaw } as const);

    const result = await adminChangeUserPlan({
      userId,
      target,
      timing,
      refundLatestPayment,
      adminUserId: authenticate.userId || currentUserData.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status: number }).status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to change user plan";
    console.error("POST admin user plan change:", error);
    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
