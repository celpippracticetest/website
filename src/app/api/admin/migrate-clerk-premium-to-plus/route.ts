import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";

/**
 * One-time migration: Clerk `publicMetadata.plan` "premium" → "plus".
 * Admin-only.
 * - `{ "dryRun": true }` — no writes; counts matches.
 * - `{ "maxUpdates": 3 }` — stop after N updates (live or dry run); safe canary.
 */
export async function POST(request: NextRequest) {
  try {
    const authenticate = await auth();
    const isAdmin =
      authenticate.sessionClaims?.metadata?.roles?.includes("admin");
    if (!isAdmin) {
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

    const c = await clerkClient();
    let offset = 0;
    let batchNumber = 0;
    let scanned = 0;
    let updated = 0;
    let capped = false;
    const errors: string[] = [];

    while (batchNumber < maxBatches) {
      const page = await c.users.getUserList({ limit: batchSize, offset });
      const users = page.data ?? [];
      if (users.length === 0) break;

      for (const user of users) {
        scanned++;
        const plan = user.publicMetadata?.plan;
        if (typeof plan !== "string" || plan.toLowerCase() !== "premium") {
          continue;
        }
        if (dryRun) {
          updated++;
          if (maxUpdates !== null && updated >= maxUpdates) {
            capped = true;
            break;
          }
          continue;
        }
        try {
          await syncUserPlanPublicMetadata(user.id, { plan: "plus" });
          updated++;
          if (maxUpdates !== null && updated >= maxUpdates) {
            capped = true;
            break;
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${user.id}: ${msg}`);
        }
      }

      if (capped) break;

      offset += users.length;
      batchNumber++;
      if (users.length < batchSize) break;
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      scanned,
      updated,
      capped,
      maxUpdates,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("migrate-clerk-premium-to-plus:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
