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
import { getSql } from "@/lib/pg/pool";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import { resolveAdminBillingSource } from "@/lib/admin/adminBillingSource";

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function nameFromAuthMeta(meta: Record<string, unknown>): {
  firstName: string | null;
  lastName: string | null;
} {
  const given =
    asString(meta.given_name) ||
    asString(meta.first_name) ||
    null;
  const family =
    asString(meta.family_name) ||
    asString(meta.last_name) ||
    null;
  if (given || family) return { firstName: given, lastName: family };

  const full = asString(meta.full_name) || asString(meta.name);
  if (!full) return { firstName: null, lastName: null };
  const parts = full.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

async function loadAuthUserFallback(identifier: string) {
  const id = identifier.trim();
  if (!id) return null;
  const sql = getSql();
  const rows = await sql<{
    id: string;
    email: string | null;
    raw_user_meta_data: Record<string, unknown> | null;
    raw_app_meta_data: Record<string, unknown> | null;
    created_at: Date;
    last_sign_in_at: Date | null;
  }[]>`
    SELECT
      id::text AS id,
      email,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      last_sign_in_at
    FROM auth.users
    WHERE id::text = ${id}
       OR lower(email) = lower(${id})
    LIMIT 1
  `;
  return rows[0] ?? null;
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
    const authUser = await loadAuthUserFallback(
      profile?.supabase_auth_user_id ||
        (isLikelySupabaseAuthUserId(resolvedParams.userId)
          ? resolvedParams.userId
          : "") ||
        resolvedParams.userId
    );

    if (!profile && !authUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const meta = {
      ...asRecord(authUser?.raw_app_meta_data),
      ...(profile?.public_metadata || {}),
    };
    const authNames = nameFromAuthMeta(asRecord(authUser?.raw_user_meta_data));

    const planRaw =
      profile?.plan ?? asString(meta.plan) ?? "free";
    const plan = hasPaidPracticeAccess(planRaw)
      ? normalizePlan(planRaw)
      : "free";
    const planType =
      profile?.plan_type ?? asString(meta.planType) ?? null;
    const planCancelled = Boolean(meta.planCancelled);
    const purchaseDate = asString(meta.purchaseDate);
    const planRenewsAt = asString(meta.planRenewsAt);
    const planExpiresAt = asString(meta.planExpiresAt);
    const planSource = asString(meta.planSource);

    const emails = [
      asString(profile?.email),
      asString(authUser?.email),
    ].filter((e): e is string => Boolean(e));

    const billing = await resolveAdminBillingSource({
      userId: resolvedParams.userId,
      supabaseAuthUserId: authUser?.id || profile?.supabase_auth_user_id,
      emails,
      stripeCustomerIdHint:
        profile?.stripe_customer_id || asString(meta.stripeCustomerId),
      publicMetadata: meta,
      paidPlan: hasPaidPracticeAccess(plan),
    });

    let subscriptionStatus: "active" | "unsubscribed" | "never" = "never";
    if (hasPaidPracticeAccess(plan)) {
      subscriptionStatus = "active";
    } else if (purchaseDate) {
      subscriptionStatus = "unsubscribed";
    }

    const stableUserId =
      profile?.legacy_clerk_user_id?.trim() ||
      profile?.supabase_auth_user_id?.trim() ||
      authUser?.id ||
      profile?.id ||
      resolvedParams.userId;

    return NextResponse.json({
      userId: stableUserId,
      email: asString(profile?.email) || asString(authUser?.email) || null,
      firstName: asString(profile?.first_name) || authNames.firstName,
      lastName: asString(profile?.last_name) || authNames.lastName,
      plan,
      planType,
      planCancelled,
      planSource: planSource || billing.provider,
      billingProvider: billing.provider,
      billingLabel: billing.label,
      googlePlaySubscriptionActive: billing.googlePlaySubscriptionActive,
      googlePlayCanCancel: billing.googlePlayCanCancel,
      stripeSubscriptionActive: billing.stripeSubscriptionActive,
      planRenewsAt,
      planExpiresAt,
      purchaseDate,
      purchaseAmount: Number(meta.purchaseAmount ?? 0) || 0,
      purchaseCurrency: asString(meta.purchaseCurrency) || "CAD",
      totalSpend: Number(meta.totalSpend ?? 0) || 0,
      stripeCustomerId: billing.stripeCustomerId,
      subscriptionStatus,
      createdAt: profile?.created_at || authUser?.created_at || null,
      updatedAt:
        profile?.updated_at ||
        authUser?.last_sign_in_at ||
        authUser?.created_at ||
        null,
    });
  } catch (error) {
    console.error("Error fetching admin user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
