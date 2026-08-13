import { NextRequest, NextResponse } from "next/server";
import {
  appUserAdmin,
  auth,
  currentUser,
  sessionClaimsHasAdminRole,
} from "@/lib/auth/server-auth";
import {
  adminChangeUserPlan,
  getAdminPlanChangeContext,
  type AdminPlanChangeMode,
  type AdminPlanChangeTiming,
} from "@/lib/admin/adminChangeUserPlan";
import { sendGa4Events } from "@/lib/ga4MeasurementProtocol";

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
    const modeRaw = String(body?.mode || "stripe").trim();
    const mode: AdminPlanChangeMode =
      modeRaw === "entitlements_only" ? "entitlements_only" : "stripe";
    const refundLatestPayment =
      mode === "entitlements_only" ? false : Boolean(body?.refundLatestPayment);
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

    let fromPlan = "unknown";
    try {
      const authAdmin = await appUserAdmin();
      const targetUser = await authAdmin.users.getUser(userId);
      const meta = (targetUser.publicMetadata || {}) as Record<string, unknown>;
      fromPlan =
        (typeof meta.planType === "string" && meta.planType) ||
        (typeof meta.plan === "string" && meta.plan) ||
        "free";
    } catch {
      // ignore — still apply plan change
    }

    const result = await adminChangeUserPlan({
      userId,
      target,
      timing: mode === "entitlements_only" ? "immediate" : timing,
      refundLatestPayment,
      mode,
      adminUserId: authenticate.userId || currentUserData.id,
    });

    const toPlan = result.targetPlanType || result.targetPlan || "unknown";
    const direction =
      fromPlan === "free" && toPlan !== "free"
        ? "upgrade"
        : toPlan === "free" && fromPlan !== "free"
          ? "downgrade"
          : fromPlan === toPlan
            ? "lateral"
            : "upgrade";
    void sendGa4Events({
      clientId: `uid.${userId.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64) || "unknown"}`,
      userId,
      events: [
        {
          name: "plan_change",
          params: {
            from_plan: fromPlan,
            to_plan: toPlan,
            direction,
          },
        },
      ],
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
