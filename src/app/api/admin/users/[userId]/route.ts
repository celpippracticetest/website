import { NextRequest, NextResponse } from "next/server";
import {
  auth,
  currentUser,
  sessionClaimsHasAdminRole,
} from "@/lib/auth/server-auth";
import {
  hasPaidPracticeAccess,
  normalizePlan,
} from "@/lib/subscriptionAccess";
import { findUserProfileForAdminLookup } from "@/lib/users/userProfilesPg";

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  const resolvedParams = await props.params;
  try {
    const currentUserData = await currentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authenticate = await auth();
    if (!sessionClaimsHasAdminRole(authenticate.sessionClaims)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await findUserProfileForAdminLookup(resolvedParams.userId);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const meta = profile.public_metadata || {};
    const planRaw = profile.plan ?? asString(meta.plan) ?? "free";
    const plan = hasPaidPracticeAccess(planRaw)
      ? normalizePlan(planRaw)
      : "free";
    const planType =
      profile.plan_type ?? asString(meta.planType) ?? null;
    const planCancelled = Boolean(meta.planCancelled);
    const purchaseDate = asString(meta.purchaseDate);
    const planRenewsAt = asString(meta.planRenewsAt);
    const planExpiresAt = asString(meta.planExpiresAt);

    let subscriptionStatus: "active" | "unsubscribed" | "never" = "never";
    if (hasPaidPracticeAccess(plan)) {
      subscriptionStatus = "active";
    } else if (purchaseDate) {
      subscriptionStatus = "unsubscribed";
    }

    const stableUserId =
      profile.legacy_clerk_user_id?.trim() ||
      profile.supabase_auth_user_id?.trim() ||
      profile.id;

    return NextResponse.json({
      userId: stableUserId,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      plan,
      planType,
      planCancelled,
      planRenewsAt,
      planExpiresAt,
      purchaseDate,
      purchaseAmount: Number(meta.purchaseAmount ?? 0) || 0,
      purchaseCurrency: asString(meta.purchaseCurrency) || "CAD",
      totalSpend: Number(meta.totalSpend ?? 0) || 0,
      stripeCustomerId: profile.stripe_customer_id,
      subscriptionStatus,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (error) {
    console.error("Error fetching admin user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
