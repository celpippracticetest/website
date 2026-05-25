import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { auth, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { getSql } from "@/lib/pg/pool";
import { stripe } from "@/lib/stripe";
import {
  revokePlusPlan,
  grantPlusPlan,
  resolveUserProfileFromStripe,
} from "@/lib/auth/supabase-user-admin";

const CONFIRM_PHRASE = "SYNC_STRIPE_STATUS";
const BATCH_SIZE = 50;
const STRIPE_DELAY_MS = 120; // stay well under Stripe's 100 req/s limit

type ProfileRow = {
  id: string;
  supabase_auth_user_id: string;
  legacy_clerk_user_id: string | null;
  stripe_customer_id: string | null;
  email: string | null;
  plan: string | null;
};

type Result = {
  profileId: string;
  action: "revoked" | "kept" | "skipped" | "granted";
  reason: string;
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Returns true when the customer has at least one active or trialing subscription. */
async function customerHasActiveSub(customerId: string): Promise<boolean> {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    limit: 10,
  });
  return subs.data.some(
    (s) => s.status === "active" || s.status === "trialing",
  );
}

/** Looks up a Stripe customer by email, returns the ID or null. */
async function findCustomerIdByEmail(email: string): Promise<string | null> {
  const result = await stripe.customers.list({
    email: email.trim().toLowerCase(),
    limit: 3,
  });
  // Prefer the most recent non-deleted customer with an active sub
  for (const c of result.data) {
    const active = await customerHasActiveSub(c.id);
    if (active) return c.id;
  }
  // Return most recent customer even if no active sub (caller handles revoke logic)
  return result.data[0]?.id ?? null;
}

/**
 * Admin endpoint: compare every 'plus' user's plan against their live Stripe
 * subscription status and revoke or keep accordingly.
 *
 * POST body:
 *   confirm  – must equal "SYNC_STRIPE_STATUS" to write (omit for dry-run)
 *   dryRun   – boolean, default true when confirm phrase is missing
 *   offset   – start row for resuming a large run (default 0)
 *   limit    – max profiles to process per call (default 200, max 1000)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!sessionClaimsHasAdminRole(session.sessionClaims)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    confirm?: string;
    dryRun?: boolean;
    offset?: number;
    limit?: number;
  };

  const dryRun = body.confirm !== CONFIRM_PHRASE || body.dryRun === true;
  const offset = Math.max(0, Number(body.offset) || 0);
  const limit = Math.min(Math.max(1, Number(body.limit) || 200), 1000);

  const sql = getSql();

  // Count total plus users for progress reporting
  const [{ total }] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM public.user_profiles
    WHERE plan = 'plus'
  `;

  const results: Result[] = [];
  let revokedCount = 0;
  let keptCount = 0;
  let skippedCount = 0;
  let grantedCount = 0;
  const errors: { profileId: string; message: string }[] = [];

  let processed = 0;

  while (processed < limit) {
    const batchLimit = Math.min(BATCH_SIZE, limit - processed);

    const rows = await sql<ProfileRow[]>`
      SELECT
        id,
        supabase_auth_user_id,
        legacy_clerk_user_id,
        stripe_customer_id,
        email,
        plan
      FROM public.user_profiles
      WHERE plan = 'plus'
      ORDER BY updated_at DESC
      LIMIT ${batchLimit}
      OFFSET ${offset + processed}
    `;

    if (rows.length === 0) break;

    for (const row of rows) {
      processed++;
      const profileId = row.id;

      try {
        let customerId = row.stripe_customer_id;
        let resolvedViaEmail = false;

        // If no customer ID stored, try to find one via email
        if (!customerId && row.email) {
          customerId = await findCustomerIdByEmail(row.email);
          resolvedViaEmail = Boolean(customerId);
          await sleep(STRIPE_DELAY_MS);
        }

        // If we still have no customer ID, skip — can't confirm Stripe status
        if (!customerId) {
          skippedCount++;
          results.push({
            profileId,
            action: "skipped",
            reason: "no stripe_customer_id and no email match in Stripe",
          });
          continue;
        }

        const hasActive = await customerHasActiveSub(customerId);
        await sleep(STRIPE_DELAY_MS);

        if (hasActive) {
          // Backfill stripe_customer_id if we found it via email
          if (resolvedViaEmail && !dryRun) {
            await sql`
              UPDATE public.user_profiles
              SET stripe_customer_id = ${customerId}, updated_at = NOW()
              WHERE id = ${profileId}::uuid
            `.catch(() => undefined);
          }
          keptCount++;
          results.push({ profileId, action: "kept", reason: "active Stripe subscription" });
        } else {
          // No active subscription — revoke plan
          if (!dryRun) {
            await revokePlusPlan(row.supabase_auth_user_id, profileId);
            // Also backfill the customer ID we resolved
            if (resolvedViaEmail) {
              await sql`
                UPDATE public.user_profiles
                SET stripe_customer_id = ${customerId}, updated_at = NOW()
                WHERE id = ${profileId}::uuid
              `.catch(() => undefined);
            }
          }
          revokedCount++;
          results.push({
            profileId,
            action: "revoked",
            reason: `no active subscription for customer ${customerId}`,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ profileId, message: msg });
      }

      await sleep(STRIPE_DELAY_MS);
    }

    if (rows.length < batchLimit) break; // reached the end
  }

  return NextResponse.json({
    dryRun,
    totalPlusUsersInDb: total,
    processed,
    revoked: revokedCount,
    kept: keptCount,
    skipped: skippedCount,
    granted: grantedCount,
    nextOffset: offset + processed,
    hasMore: offset + processed < total,
    errors: errors.length ? errors : undefined,
    results: results.slice(0, 500), // cap to avoid giant responses
  });
}
