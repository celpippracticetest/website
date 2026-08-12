/**
 * Second-pass backfill for legacy user_profiles without supabase_auth_user_id.
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

async function listLiveSubs(stripe, customerId) {
  if (!customerId) return [];
  const page = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  return page.data;
}

function hasActive(subs) {
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
      stripe_id, customer_id, status, created_at,
      current_period_start_at, current_period_end_at,
      canceled_at, cancel_at_period_end, price_id, interval, interval_count,
      coupon_id, promotion_code_id, dunning_status, metadata, updated_at
    ) VALUES (
      ${sub.id}, ${customerId}, ${sub.status}, ${new Date(sub.created * 1000)},
      ${periodStart ? new Date(periodStart * 1000) : null},
      ${periodEnd ? new Date(periodEnd * 1000) : null},
      ${sub.canceled_at ? new Date(sub.canceled_at * 1000) : null},
      ${Boolean(sub.cancel_at_period_end)},
      ${firstPrice?.id || null},
      ${firstPrice?.recurring?.interval || null},
      ${firstPrice?.recurring?.interval_count || null},
      ${null}, ${null}, ${null},
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
      metadata = EXCLUDED.metadata,
      updated_at = EXCLUDED.updated_at
  `;
}

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const rows = await sql`
    SELECT
      p.id,
      p.email,
      p.plan,
      p.plan_type,
      p.supabase_auth_user_id,
      p.stripe_customer_id,
      p.public_metadata,
      p.legacy_clerk_user_id,
      ss.stripe_id,
      ss.status AS stripe_status
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
    WHERE lower(coalesce(p.plan, '')) IN ('plus', 'premium', 'pro', 'enterprise')
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
      -- Keep currently canceling-but-still-active live entitlements alone via Stripe check below
    ORDER BY p.email
  `;

  const summary = { downgraded: [], skippedActive: [], errors: [] };

  for (const row of rows) {
    const email = row.email || "(no-email)";
    try {
      // Skip known still-active canceling account with future period end
      if (
        email === "celpip@multilingualtraining.com" &&
        row.stripe_status === "active"
      ) {
        // Still verify live
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

      if (!liveSubs.length && email.includes("@")) {
        const customers = await stripe.customers.list({ email, limit: 5 });
        for (const c of customers.data) {
          const subs = await listLiveSubs(stripe, c.id);
          liveSubs.push(...subs);
          if (!customerId) customerId = c.id;
        }
      }

      for (const sub of liveSubs) {
        await mirrorSub(sql, sub);
      }

      if (hasActive(liveSubs)) {
        summary.skippedActive.push(email);
        console.log(`SKIP still_active ${email}`);
        continue;
      }

      const existingMeta = asRecord(row.public_metadata);
      const publicMetadata = {
        ...existingMeta,
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
        WHERE id = ${row.id}::uuid
      `;

      // If an auth user exists by email, sync app_metadata too
      if (email.includes("@")) {
        const authRows = await sql`
          SELECT id, raw_app_meta_data
          FROM auth.users
          WHERE lower(email) = lower(${email})
          LIMIT 1
        `;
        if (authRows[0]) {
          const uid = String(authRows[0].id);
          const app = {
            ...asRecord(authRows[0].raw_app_meta_data),
            plan: "free",
            planType: "",
            planCancelled: false,
            planExpiresAt: null,
            planRenewsAt: null,
          };
          const { error: updErr } = await admin.auth.admin.updateUserById(uid, {
            app_metadata: app,
          });
          if (updErr) console.warn(`auth update warn ${email}: ${updErr.message}`);
          else {
            // Link profile if missing supabase id
            if (!row.supabase_auth_user_id) {
              await sql`
                UPDATE public.user_profiles
                SET supabase_auth_user_id = ${uid}::uuid, updated_at = now()
                WHERE id = ${row.id}::uuid
                  AND supabase_auth_user_id IS NULL
              `;
            }
          }
        }
      }

      // doc_users best-effort
      await sql`
        UPDATE public.doc_users
        SET
          body = jsonb_set(
            jsonb_set(
              jsonb_set(COALESCE(body, '{}'::jsonb), '{plan}', '"free"'),
              '{publicMetadata,plan}', '"free"'
            ),
            '{publicMetadata,planCancelled}', 'false'::jsonb
          ),
          updated_at = now()
        WHERE lower(coalesce(body->>'email','')) = lower(${email})
      `.catch(() => null);

      summary.downgraded.push(email);
      console.log(`OK downgrade ${email} (was ${row.plan})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push({ email, error: msg });
      console.error(`ERR ${email}: ${msg}`);
    }
  }

  const leftover = await sql`
    SELECT count(*)::int AS n
    FROM public.user_profiles p
    LEFT JOIN LATERAL (
      SELECT *
      FROM public.stripe_subscriptions ss
      WHERE ss.metadata->>'user_id' = p.supabase_auth_user_id::text
         OR (p.stripe_customer_id IS NOT NULL AND ss.customer_id = p.stripe_customer_id)
      ORDER BY CASE WHEN ss.status IN ('active','trialing') THEN 0 ELSE 1 END, ss.created_at DESC
      LIMIT 1
    ) ss ON true
    WHERE lower(coalesce(p.plan,'')) IN ('plus','premium','pro','enterprise')
      AND (
        ss.status IN ('canceled','unpaid','incomplete_expired')
        OR (
          coalesce(p.public_metadata->>'planCancelled','false') = 'true'
          AND coalesce(p.public_metadata->>'planExpiresAt','') <> ''
          AND (p.public_metadata->>'planExpiresAt')::timestamptz < now()
        )
      )
  `;

  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        downgradedCount: summary.downgraded.length,
        skippedActiveCount: summary.skippedActive.length,
        errorCount: summary.errors.length,
        leftoverStale: leftover[0]?.n,
        downgraded: summary.downgraded,
        skippedActive: summary.skippedActive,
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
