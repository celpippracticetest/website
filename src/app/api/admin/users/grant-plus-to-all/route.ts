import { NextRequest, NextResponse } from "next/server";
import { auth, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readLegacyImportedExternalUserId } from "@/lib/auth/supabase-user-plan";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";

const CONFIRM_PHRASE = "GRANT_PLUS_ALL_USERS";

const PER_PAGE = 200;

/**
 * Admin-only: set `publicMetadata.plan` to `plus` for every Supabase Auth user (and mirror to Mongo),
 * same as a successful subscription upgrade path (`syncUserPlanPublicMetadata`).
 *
 * POST body:
 * - `confirm` (required): must be `"GRANT_PLUS_ALL_USERS"`
 * - `dryRun` (optional): if true, only count users — no writes
 */
export async function POST(request: NextRequest) {
  try {
    const authenticate = await auth();
    if (!sessionClaimsHasAdminRole(authenticate.sessionClaims)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Supabase admin is not configured on this deployment." },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      confirm?: string;
      dryRun?: boolean;
    };

    if (body.confirm !== CONFIRM_PHRASE) {
      return NextResponse.json(
        {
          error: "Missing or invalid confirm phrase.",
          expectedConfirm: CONFIRM_PHRASE,
        },
        { status: 400 },
      );
    }

    const dryRun = Boolean(body.dryRun);

    let page = 1;
    let processed = 0;
    let updated = 0;
    const errors: { userId: string; message: string }[] = [];

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });

      if (error) {
        return NextResponse.json(
          { error: error.message || "listUsers failed", page },
          { status: 500 },
        );
      }

      const batch = data?.users ?? [];
      if (batch.length === 0) {
        break;
      }

      for (const u of batch) {
        processed++;
        const stableId = readLegacyImportedExternalUserId(u) ?? u.id;
        if (dryRun) {
          continue;
        }
        try {
          await syncUserPlanPublicMetadata(stableId, { plan: "plus" });
          updated++;
        } catch (e) {
          errors.push({
            userId: stableId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      if (batch.length < PER_PAGE) {
        break;
      }
      page += 1;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      processed,
      updated: dryRun ? 0 : updated,
      wouldUpdate: dryRun ? processed : undefined,
      errors: errors.length ? errors : undefined,
      pages: page,
    });
  } catch (e) {
    console.error("[admin/users/grant-plus-to-all]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
