import { NextRequest, NextResponse } from "next/server";
import { auth, appUserAdmin, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import documentsClient from "@/lib/appDocumentsClient";
import { getSql } from "@/lib/pg/pool";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";

function shouldMigrateAuthPlanToPlus(plan: unknown): boolean {
  if (typeof plan !== "string") return false;
  const p = plan.trim().toLowerCase();
  return p === "premium" || p === "pro" || p === "enterprise";
}

/**
 * Migration: legacy paid plan keys (`premium`, `pro`, `enterprise`) → `plus` across Supabase Auth, Postgres `user_profiles`,
 * and `app_documents` `users` rows (mirrors `syncUserPlanPublicMetadata` + SQL migration).
 *
 * Admin-only. Body:
 * - `dryRun` — no writes; report counts.
 * - `maxUpdates` — cap Auth sync updates (default unlimited within batch limits).
 * - `batchSize` / `maxBatches` — Auth user list paging.
 * - `syncAuth` (default true) — Supabase Auth + per-user Mongo mirror via `syncUserPlanPublicMetadata`.
 * - `syncPostgresProfiles` (default true) — `UPDATE public.user_profiles …` when `DATABASE_URL` works.
 * - `syncDocumentUsers` (default true) — `users` collection bulk `$set` for matching rows.
 */
export async function POST(request: NextRequest) {
  try {
    const authenticate = await auth();
    if (!sessionClaimsHasAdminRole(authenticate.sessionClaims)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);
    const batchSize = Math.min(Number(body.batchSize) || 100, 500);
    const maxBatches = Math.min(Number(body.maxBatches) || 500, 2000);
    const maxUpdatesRaw = body.maxUpdates;
    const maxUpdates =
      maxUpdatesRaw !== undefined && maxUpdatesRaw !== null && maxUpdatesRaw !== ""
        ? Math.max(0, Math.min(Number(maxUpdatesRaw), 50_000))
        : null;

    const syncAuth = body.syncAuth !== false;
    const syncPostgresProfiles = body.syncPostgresProfiles !== false;
    const syncDocumentUsers = body.syncDocumentUsers !== false;

    const c = await appUserAdmin();
    let offset = 0;
    let batchNumber = 0;
    let scanned = 0;
    let authUpdated = 0;
    let capped = false;
    const errors: string[] = [];

    if (syncAuth) {
      while (batchNumber < maxBatches) {
        const page = await c.users.getUserList({ limit: batchSize, offset });
        const users = page.data ?? [];
        if (users.length === 0) break;

        for (const user of users) {
          scanned++;
          const plan = user.publicMetadata?.plan;
          if (!shouldMigrateAuthPlanToPlus(plan)) {
            continue;
          }
          if (dryRun) {
            authUpdated++;
            if (maxUpdates !== null && authUpdated >= maxUpdates) {
              capped = true;
              break;
            }
            continue;
          }
          try {
            await syncUserPlanPublicMetadata(String(user.id), { plan: "plus" });
            authUpdated++;
            if (maxUpdates !== null && authUpdated >= maxUpdates) {
              capped = true;
              break;
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`auth:${user.id}: ${msg}`);
          }
        }

        if (capped) break;

        offset += users.length;
        batchNumber++;
        if (users.length < batchSize) break;
      }
    }

    let postgresMatched = 0;
    let postgresUpdated = 0;
    if (syncPostgresProfiles) {
      try {
        const sql = getSql();
        const countRows = await sql<{ c: number }[]>`
          SELECT count(*)::int AS c
          FROM public.user_profiles
          WHERE lower(trim(coalesce(plan, ''))) IN ('premium', 'pro', 'enterprise')
             OR lower(trim(coalesce(public_metadata ->> 'plan', ''))) IN ('premium', 'pro', 'enterprise')
        `;
        postgresMatched = countRows[0]?.c ?? 0;

        if (!dryRun && postgresMatched > 0) {
          const updatedRows = await sql<{ id: string }[]>`
            UPDATE public.user_profiles
            SET
              plan = 'plus',
              public_metadata = coalesce(public_metadata::jsonb, '{}'::jsonb)
                || jsonb_build_object('plan', 'plus'),
              updated_at = now()
            WHERE lower(trim(coalesce(plan, ''))) IN ('premium', 'pro', 'enterprise')
               OR lower(trim(coalesce(public_metadata ->> 'plan', ''))) IN ('premium', 'pro', 'enterprise')
            RETURNING id
          `;
          postgresUpdated = updatedRows.length;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`postgres: ${msg}`);
      }
    }

    let mongoMatched = 0;
    let mongoUpdated = 0;
    if (syncDocumentUsers) {
      try {
        const db = await documentsClient.db();
        const coll = db.collection("users");
        const filter = {
          $or: [
            {
              plan: {
                $in: ["premium", "Premium", "pro", "Pro", "enterprise", "Enterprise"],
              },
            },
            {
              "publicMetadata.plan": {
                $in: ["premium", "Premium", "pro", "Pro", "enterprise", "Enterprise"],
              },
            },
          ],
        };
        mongoMatched = await coll.countDocuments(filter);
        if (!dryRun && mongoMatched > 0) {
          const r = await coll.updateMany(filter, {
            $set: {
              plan: "plus",
              "publicMetadata.plan": "plus",
              updatedAt: new Date(),
            },
          });
          mongoUpdated = r.modifiedCount;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`mongo: ${msg}`);
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      scanned,
      updated: authUpdated,
      capped,
      maxUpdates,
      auth: { scanned, updated: authUpdated, capped, maxUpdates },
      postgres: {
        matched: postgresMatched,
        updated: dryRun ? 0 : postgresUpdated,
        wouldUpdate: dryRun ? postgresMatched : undefined,
      },
      mongoUsers: {
        matched: mongoMatched,
        updated: dryRun ? 0 : mongoUpdated,
        wouldUpdate: dryRun ? mongoMatched : undefined,
      },
      errorCount: errors.length,
      errors: errors.slice(0, 50),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("migrate-premium-to-plus:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
