import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { auth, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { getSql } from "@/lib/pg/pool";
import { stripe } from "@/lib/stripe";
import { revokePlusPlan } from "@/lib/auth/supabase-user-admin";

const CONFIRM_PHRASE = "SYNC_STRIPE_STATUS";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const STRIPE_CONCURRENCY = 5;

type ProfileRow = {
  id: string;
  supabase_auth_user_id: string;
  stripe_customer_id: string | null;
};

type RowResult = {
  profileId: string;
  action: "revoked" | "kept" | "skipped" | "error";
  reason: string;
};

/** Returns true when the customer has at least one active or trialing subscription. */
async function customerHasActiveSub(customerId: string): Promise<boolean> {
  const subs = await stripe.subscriptions.list({ customer: customerId, limit: 5 });
  return subs.data.some((s) => s.status === "active" || s.status === "trialing");
}

/** Run async tasks in parallel with a concurrency cap. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const settled = await Promise.allSettled(chunk.map(fn));
    for (const s of settled) {
      if (s.status === "fulfilled") results.push(s.value);
      else results.push(s.reason as R);
    }
  }
  return results;
}

async function processRow(
  row: ProfileRow,
  dryRun: boolean,
  sql: ReturnType<typeof getSql>,
): Promise<RowResult> {
  const profileId = row.id;

  try {
    const customerId = row.stripe_customer_id;

    if (!customerId) {
      return { profileId, action: "skipped", reason: "no stripe_customer_id stored" };
    }

    const hasActive = await customerHasActiveSub(customerId);

    if (hasActive) {
      return { profileId, action: "kept", reason: "active subscription" };
    }

    // No active subscription — revoke
    if (!dryRun) {
      await revokePlusPlan(row.supabase_auth_user_id, profileId);
    }
    return {
      profileId,
      action: "revoked",
      reason: `no active sub for customer ${customerId}`,
    };
  } catch (err) {
    return {
      profileId,
      action: "error",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Admin endpoint: check live Stripe subscription status for 'plus' users and
 * revoke plan for any who have no active or trialing subscription.
 *
 * Designed for small batches (default 25) called in a loop from the browser
 * console to avoid serverless timeouts.
 *
 * POST body:
 *   confirm  – must equal "SYNC_STRIPE_STATUS" to write
 *   dryRun   – boolean (default true when confirm is missing)
 *   offset   – pagination offset (default 0)
 *   limit    – users per call (default 25, max 50)
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
  const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIMIT), MAX_LIMIT);

  const sql = getSql();

  const [{ total }] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total FROM public.user_profiles WHERE plan = 'plus'
  `;

  const rows = await sql<ProfileRow[]>`
    SELECT id, supabase_auth_user_id, stripe_customer_id
    FROM public.user_profiles
    WHERE plan = 'plus'
    ORDER BY updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const rowResults = await mapWithConcurrency(
    rows,
    STRIPE_CONCURRENCY,
    (row) => processRow(row, dryRun, sql),
  );

  const revoked  = rowResults.filter((r) => r.action === "revoked").length;
  const kept     = rowResults.filter((r) => r.action === "kept").length;
  const skipped  = rowResults.filter((r) => r.action === "skipped").length;
  const errored  = rowResults.filter((r) => r.action === "error").length;

  return NextResponse.json({
    dryRun,
    totalPlusUsersInDb: total,
    processed: rows.length,
    revoked,
    kept,
    skipped,
    errored,
    nextOffset: offset + rows.length,
    hasMore: offset + rows.length < total,
    results: rowResults,
  });
}
