/**
 * One-off backfill: users stuck on paid plan after Stripe cancel/period end.
 * Verifies live Stripe before downgrading.
 */
const fs = require("fs");
const path = require("path");
const postgres = require("postgres");
const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function asRecord(v) {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return typeof v === "object" && !Array.isArray(v) ? v : {};
}

function isPaidPlan(plan) {
  const p = String(plan || "")
    .trim()
    .toLowerCase();
  return p === "plus" || p === "premium" || p === "pro" || p === "enterprise";
}

function hasAdminOverride(meta) {
  return meta?.planOverrideSource === "admin";
}

async function listLiveSubs(stripe, customerId) {
  if (!customerId) return [];
  const page = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  return page.data;
}

function hasActiveEntitlement(subs) {
  return subs.some((s) => s.status === "active" || s.status === "trialing");
}

async function mirrorSub(sql, sub) {
  const firstPrice = sub.items?.data?.[0]?.price;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null;
  const periodEnd =
    sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end ?? null;
  const periodStart =
    sub.items?.data?.[0]?.current_period_start ??
    sub.current_period_start ??
    null;

  await sql`
    INSERT INTO public.stripe_subscriptions (
      stripe_id,
      customer_id,
      status,
      created_at,
      current_period_start_at,
      current_period_end_at,
      canceled_at,
      cancel_at_period_end,
      price_id,
      interval,
      interval_count,
      coupon_id,
      promotion_code_id,
      dunning_status,
      metadata,
      updated_at
    ) VALUES (
      ${sub.id},
      ${customerId},
      ${sub.status},
      ${new Date(sub.created * 1000)},
      ${periodStart ? new Date(periodStart * 1000) : null},
      ${periodEnd ? new Date(periodEnd * 1000) : null},
      ${sub.canceled_at ? new Date(sub.canceled_at * 1000) : null},
      ${Boolean(sub.cancel_at_period_end)},
      ${firstPrice?.id || null},
      ${firstPrice?.recurring?.interval || null},
      ${firstPrice?.recurring?.interval_count || null},
      ${null},
      ${null},
      ${
        sub.status === "past_due" ||
        sub.status === "unpaid" ||
        sub.status === "incomplete_expired"
          ? sub.status
          : null
      },
      ${JSON.stringify(sub.metadata || {})}::jsonb,
      ${new Date()}
    )
    ON CONFLICT (stripe_id) DO UPDATE SET
      customer_id = EXCLUDED.customer_id,
      status = EXCLUDED.status,
      current_period_start_at = EXCLUDED.current_period_start_at,
      current_period_end_at = EXCLUDED.current_period_end_at,
      canceled_at = EXCLUDED.canceled_at,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      price_id = EXCLUDED.price_id,
      interval = EXCLUDED.interval,
      interval_count = EXCLUDED.interval_count,
      dunning_status = EXCLUDED.dunning_status,
      metadata = EXCLUDED.metadata,
      updated_at = EXCLUDED.updated_at
  `;
}

async function downgradeUser(sql, admin, row) {
  const userId = String(row.supabase_auth_user_id);
  const email = row.email;

  const { data: userData, error: getErr } =
    await admin.auth.admin.getUserById(userId);
  if (getErr || !userData?.user) {
    throw new Error(getErr?.message || `auth user missing: ${userId}`);
  }

  const user = userData.user;
  const app = { ...(user.app_metadata || {}) };
  const meta = { ...(user.user_metadata || {}) };

  if (hasAdminOverride(app) || hasAdminOverride(asRecord(row.public_metadata))) {
    return { skipped: true, reason: "admin_override" };
  }

  app.plan = "free";
  app.planType = "";
  app.planCancelled = false;
  app.planExpiresAt = null;
  app.planRenewsAt = null;

  const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: app,
    user_metadata: meta,
  });
  if (updErr) throw updErr;

  const existingMeta = asRecord(row.public_metadata);
  const publicMetadata = {
    ...existingMeta,
    ...app,
    plan: "free",
    planType: "",
    planCancelled: false,
    planExpiresAt: null,
    planRenewsAt: null,
  };

  await sql`
    UPDATE public.user_profiles
    SET
      plan = 'free',
      plan_type = '',
      public_metadata = ${JSON.stringify(publicMetadata)}::jsonb,
      updated_at = now()
    WHERE supabase_auth_user_id = ${userId}::uuid
  `;

  // Best-effort users document mirror
  await sql`
    UPDATE public.doc_users
    SET
      body = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(body, '{}'::jsonb),
                '{plan}', '"free"'
              ),
              '{planType}', '""'
            ),
            '{publicMetadata,plan}', '"free"'
          ),
          '{publicMetadata,planType}', '""'
        ),
        '{publicMetadata,planCancelled}', 'false'::jsonb
      ),
      updated_at = now()
    WHERE body->>'supabaseUserId' = ${userId}
       OR body->>'clerkUserId' = ${userId}
       OR (lower(coalesce(body->>'email', '')) = lower(${email || ""}))
  `.catch(() => null);

  return { skipped: false };
}

async function main() {
  loadEnv();
  const dryRun = process.argv.includes("--dry-run");
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const candidates = await sql`
    SELECT
      p.supabase_auth_user_id,
      p.email,
      p.plan,
      p.plan_type,
      p.stripe_customer_id,
      p.public_metadata,
      p.legacy_clerk_user_id,
      ss.stripe_id,
      ss.status AS stripe_status,
      ss.cancel_at_period_end,
      ss.current_period_end_at
    FROM public.user_profiles p
    LEFT JOIN LATERAL (
      SELECT *
      FROM public.stripe_subscriptions ss
      WHERE ss.metadata->>'user_id' = p.supabase_auth_user_id::text
         OR (
           NULLIF(TRIM(COALESCE(p.legacy_clerk_user_id, '')), '') IS NOT NULL
           AND ss.metadata->>'user_id' = p.legacy_clerk_user_id
         )
         OR (p.stripe_customer_id IS NOT NULL AND ss.customer_id = p.stripe_customer_id)
      ORDER BY
        CASE WHEN ss.status IN ('active', 'trialing') THEN 0 ELSE 1 END,
        ss.created_at DESC
      LIMIT 1
    ) ss ON true
    WHERE p.supabase_auth_user_id IS NOT NULL
      AND lower(coalesce(p.plan, '')) IN ('plus', 'premium', 'pro', 'enterprise')
      AND (
        ss.status IN ('canceled', 'unpaid', 'incomplete_expired')
        OR (
          coalesce(p.public_metadata->>'planCancelled', 'false') = 'true'
          AND coalesce(p.public_metadata->>'planExpiresAt', '') <> ''
          AND (p.public_metadata->>'planExpiresAt')::timestamptz < now()
        )
        OR (
          ss.cancel_at_period_end = true
          AND ss.current_period_end_at IS NOT NULL
          AND ss.current_period_end_at < now()
        )
      )
    ORDER BY p.updated_at DESC NULLS LAST
  `;

  console.log(`candidates=${candidates.length} dryRun=${dryRun}`);

  const summary = {
    downgraded: [],
    skippedActive: [],
    skippedAdmin: [],
    skippedNoCustomer: [],
    errors: [],
  };

  for (const row of candidates) {
    const email = row.email || "(no-email)";
    const userId = String(row.supabase_auth_user_id);
    try {
      if (hasAdminOverride(asRecord(row.public_metadata))) {
        summary.skippedAdmin.push(email);
        console.log(`SKIP admin_override ${email}`);
        continue;
      }

      let customerId = row.stripe_customer_id;
      let liveSubs = [];

      if (customerId) {
        liveSubs = await listLiveSubs(stripe, customerId);
      } else if (row.stripe_id) {
        try {
          const one = await stripe.subscriptions.retrieve(row.stripe_id);
          liveSubs = [one];
          customerId =
            typeof one.customer === "string"
              ? one.customer
              : one.customer?.id || null;
        } catch {
          liveSubs = [];
        }
      }

      // Also search Stripe by email if still nothing
      if (!liveSubs.length && email.includes("@")) {
        const customers = await stripe.customers.list({ email, limit: 5 });
        for (const c of customers.data) {
          const subs = await listLiveSubs(stripe, c.id);
          liveSubs.push(...subs);
          if (!customerId) customerId = c.id;
        }
      }

      // Always refresh mirror rows we found
      if (!dryRun) {
        for (const sub of liveSubs) {
          await mirrorSub(sql, sub);
        }
      }

      if (hasActiveEntitlement(liveSubs)) {
        summary.skippedActive.push({
          email,
          statuses: liveSubs.map((s) => `${s.id}:${s.status}`),
        });
        console.log(
          `SKIP still_active ${email} ${liveSubs
            .map((s) => s.status)
            .join(",")}`
        );
        continue;
      }

      // No active/trialing Stripe sub — safe to downgrade if paid plan is stale
      if (!isPaidPlan(row.plan)) {
        continue;
      }

      if (dryRun) {
        summary.downgraded.push(email);
        console.log(
          `DRY downgrade ${email} plan=${row.plan} stripe=${
            liveSubs.map((s) => s.status).join(",") || "none"
          }`
        );
        continue;
      }

      const result = await downgradeUser(sql, admin, row);
      if (result.skipped) {
        summary.skippedAdmin.push(email);
        console.log(`SKIP ${result.reason} ${email}`);
      } else {
        summary.downgraded.push(email);
        console.log(
          `OK downgrade ${email} (was ${row.plan}/${row.plan_type || "-"})`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push({ email, userId, error: msg });
      console.error(`ERR ${email}: ${msg}`);
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        dryRun,
        downgradedCount: summary.downgraded.length,
        skippedActiveCount: summary.skippedActive.length,
        skippedAdminCount: summary.skippedAdmin.length,
        errorCount: summary.errors.length,
        downgraded: summary.downgraded,
        skippedActive: summary.skippedActive,
        skippedAdmin: summary.skippedAdmin,
        errors: summary.errors,
      },
      null,
      2
    )
  );

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
