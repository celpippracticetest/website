import { NextRequest, NextResponse } from "next/server";
import { auth, appUserAdmin, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import client from "@/lib/appDocumentsClient";
import { matchUsersCollectionByWebUserIds } from "@/lib/users/userDocumentIdentity";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";
import { getSql } from "@/lib/pg/pool";
import { normalizePlan } from "@/lib/subscriptionAccess";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await props.params;

    const authenticate = await auth();
    if (!sessionClaimsHasAdminRole(authenticate.sessionClaims)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { planType?: string };
    const planType = body.planType?.trim() || "Admin Grant";

    const authAdmin = await appUserAdmin();
    let user;
    try {
      user = await authAdmin.users.getUser(userId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: `User not found in auth directory: ${message}` },
        { status: 404 }
      );
    }

    const currentMetadata = (user.publicMetadata || {}) as Record<string, unknown>;
    if (normalizePlan(currentMetadata.plan as string) === "plus") {
      return NextResponse.json(
        { error: "User is already on the Plus plan" },
        { status: 400 }
      );
    }

    const now = new Date();

    await syncUserPlanPublicMetadata(userId, {
      plan: "plus",
      planType,
      planCancelled: false,
      planExpiresAt: null,
    });

    const db = client.db();
    await db.collection("users").updateOne(
      matchUsersCollectionByWebUserIds(userId),
      {
        $set: {
          subscriptionStartDate: now,
          subscriptionEndDate: null,
          subscriptionDurationDays: null,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    try {
      const sql = getSql();
      await sql`
        UPDATE public.user_profiles
        SET
          plan = 'plus',
          plan_type = ${planType},
          public_metadata = coalesce(public_metadata::jsonb, '{}'::jsonb)
            || jsonb_build_object(
              'plan', 'plus',
              'planType', ${planType},
              'planCancelled', false,
              'planExpiresAt', null
            ),
          updated_at = now()
        WHERE legacy_clerk_user_id = ${userId}
           OR supabase_auth_user_id::text = ${userId}
           OR (legacy_body ->> 'sub') = ${userId}
      `;
    } catch (pgError) {
      console.warn("[admin/users/grant-plus] Postgres sync skipped:", pgError);
    }

    return NextResponse.json({
      success: true,
      message: `Granted Plus plan to ${user.emailAddresses?.[0]?.emailAddress || userId}`,
      plan: "plus",
      planType,
    });
  } catch (error: unknown) {
    console.error("[admin/users/grant-plus]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to grant Plus plan" },
      { status: 500 }
    );
  }
}
