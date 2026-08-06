/**
 * One-off: downgrade app entitlements when Stripe has no billable subscription.
 * Skips admin overrides and Apple/Google/PayPal plan sources.
 *
 * Usage:
 *   node scripts/reconcile-stale-stripe-plans.mjs           # dry-run
 *   node scripts/reconcile-stale-stripe-plans.mjs --apply   # write changes
 */
import postgres from "postgres";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const APPLY = process.argv.includes("--apply");

const envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
function envVal(key) {
  const line = envText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(key + "="));
  if (!line) return null;
  return line
    .slice(key.length + 1)
    .replace(/^"|"$/g, "")
    .replace(/^'|'$/g, "");
}

for (const [k, v] of Object.entries({
  STRIPE_SECRET_KEY: envVal("STRIPE_SECRET_KEY"),
  NEXT_PUBLIC_SUPABASE_URL: envVal("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: envVal("SUPABASE_SERVICE_ROLE_KEY"),
  DATABASE_URL: envVal("DATABASE_URL"),
})) {
  if (v && !process.env[k]) process.env[k] = v;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });

const KEEP_STATUSES = new Set(["active", "trialing", "past_due"]);

async function hasBillableStripeSub(customerId) {
  // One list call instead of three — fewer Stripe rate-limit hits.
  const page = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  const billable = page.data.find((s) => KEEP_STATUSES.has(s.status));
  if (billable) return { billable: true, status: billable.status };
  return { billable: false, status: null };
}

async function hasBillableStripeSubWithRetry(customerId, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await hasBillableStripeSub(customerId);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const rateLimited = /rate limit/i.test(msg);
      if (!rateLimited || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

function shouldSkip(meta) {
  const override = String(meta?.planOverrideSource || "").toLowerCase();
  if (override === "admin") return "admin_override";
  const source = String(meta?.planSource || "").toLowerCase();
  if (source === "apple" || source === "google_play" || source === "paypal") {
    return `plan_source:${source}`;
  }
  return null;
}

async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return out;
}

try {
  const paid = await sql`
    SELECT
      id::text AS profile_id,
      email,
      plan,
      plan_type,
      stripe_customer_id,
      supabase_auth_user_id::text AS auth_id,
      legacy_clerk_user_id AS clerk_id,
      public_metadata
    FROM public.user_profiles
    WHERE lower(trim(coalesce(plan, ''))) IN ('plus', 'premium', 'pro', 'enterprise')
      AND coalesce(public_metadata->>'planCancelled', 'false') <> 'true'
      AND stripe_customer_id IS NOT NULL
      AND trim(stripe_customer_id) <> ''
    ORDER BY email NULLS LAST
  `;

  console.log(`Paid profiles with Stripe customer: ${paid.length}`);
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN (pass --apply to write)");

  const checked = await mapPool(paid, 3, async (p) => {
    const meta = p.public_metadata || {};
    const skip = shouldSkip(meta);
    if (skip) {
      return { ...p, action: "skip", reason: skip };
    }
    try {
      const { billable, status } = await hasBillableStripeSubWithRetry(
        p.stripe_customer_id
      );
      if (billable) {
        return { ...p, action: "keep", reason: `stripe:${status}` };
      }
      return { ...p, action: "downgrade", reason: "no_billable_stripe_sub" };
    } catch (err) {
      return {
        ...p,
        action: "error",
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  });

  const toDowngrade = checked.filter((r) => r.action === "downgrade");
  const kept = checked.filter((r) => r.action === "keep");
  const skipped = checked.filter((r) => r.action === "skip");
  const errors = checked.filter((r) => r.action === "error");

  console.log({
    keep: kept.length,
    downgrade: toDowngrade.length,
    skip: skipped.length,
    errors: errors.length,
  });
  console.log(
    "Sample downgrades:",
    toDowngrade.slice(0, 15).map((r) => r.email || r.profile_id)
  );
  if (errors.length) {
    console.log(
      "Errors:",
      errors.slice(0, 5).map((r) => ({ email: r.email, reason: r.reason }))
    );
  }

  if (!APPLY) {
    console.log("Dry-run complete. Re-run with --apply to downgrade.");
    process.exit(0);
  }

  let ok = 0;
  let fail = 0;
  for (const row of toDowngrade) {
    const meta = { ...(row.public_metadata || {}) };
    meta.plan = "free";
    meta.planType = "";
    meta.planCancelled = false;
    meta.planExpiresAt = null;
    meta.planRenewsAt = null;
    meta.planReconciledAt = new Date().toISOString();
    meta.planReconcileReason = "stripe_no_billable_subscription";

    try {
      await sql`
        UPDATE public.user_profiles
        SET
          plan = 'free',
          plan_type = '',
          public_metadata = ${JSON.stringify(meta)}::jsonb,
          updated_at = now()
        WHERE id = ${row.profile_id}::uuid
      `;

      const authId = row.auth_id || null;
      if (authId) {
        const { data: userData, error: getErr } =
          await supabase.auth.admin.getUserById(authId);
        if (getErr) throw getErr;
        const app = { ...(userData.user?.app_metadata || {}) };
        app.plan = "free";
        app.planType = "";
        app.planCancelled = false;
        app.planExpiresAt = null;
        app.planRenewsAt = null;
        const { error: updErr } = await supabase.auth.admin.updateUserById(
          authId,
          { app_metadata: app }
        );
        if (updErr) throw updErr;
      }

      // Best-effort legacy users doc
      await sql`
        UPDATE doc_users
        SET
          body = jsonb_set(
            jsonb_set(
              jsonb_set(
                coalesce(body, '{}'::jsonb),
                '{plan}',
                '"free"'::jsonb
              ),
              '{planType}',
              '""'::jsonb
            ),
            '{publicMetadata}',
            coalesce(body->'publicMetadata', '{}'::jsonb) || ${JSON.stringify({
              plan: "free",
              planType: "",
              planCancelled: false,
              planExpiresAt: null,
              planRenewsAt: null,
              planReconciledAt: meta.planReconciledAt,
              planReconcileReason: meta.planReconcileReason,
            })}::jsonb
          ),
          updated_at = now()
        WHERE mongo_id = ${row.clerk_id || row.auth_id || ""}
           OR body->>'supabaseUserId' = ${row.auth_id || ""}
           OR body->>'clerkUserId' = ${row.clerk_id || ""}
      `.catch(() => null);

      ok += 1;
      console.log("downgraded", row.email || row.profile_id);
    } catch (err) {
      fail += 1;
      console.error(
        "failed",
        row.email || row.profile_id,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log({ applied_ok: ok, applied_fail: fail });
} finally {
  await sql.end({ timeout: 2 });
}
