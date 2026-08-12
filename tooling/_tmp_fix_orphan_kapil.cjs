const fs = require("fs");
const path = require("path");
const postgres = require("postgres");
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

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const email = "kapilkajal74700@gmail.com";

  const profiles = await sql`
    SELECT * FROM public.user_profiles
    WHERE lower(email) = lower(${email})
  `;
  console.log(
    "profiles",
    profiles.map((p) => ({
      id: p.id,
      supabase_auth_user_id: p.supabase_auth_user_id,
      plan: p.plan,
      stripe_customer_id: p.stripe_customer_id,
    }))
  );

  for (const p of profiles) {
    const meta = {
      ...(typeof p.public_metadata === "object" && p.public_metadata
        ? p.public_metadata
        : {}),
      plan: "free",
      planType: "",
      planCancelled: false,
      planExpiresAt: null,
      planRenewsAt: null,
    };
    await sql`
      UPDATE public.user_profiles
      SET plan = 'free',
          plan_type = '',
          public_metadata = ${JSON.stringify(meta)}::jsonb,
          updated_at = now()
      WHERE id = ${p.id}::uuid
    `;
  }

  // Mirror any stripe subs for this customer/email
  const custId = profiles[0]?.stripe_customer_id;
  if (custId) {
    const subs = await stripe.subscriptions.list({
      customer: custId,
      status: "all",
      limit: 20,
    });
    for (const sub of subs.data) {
      const firstPrice = sub.items?.data?.[0]?.price;
      const periodEnd =
        sub.items?.data?.[0]?.current_period_end ??
        sub.current_period_end ??
        null;
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
          ${sub.id}, ${custId}, ${sub.status}, ${new Date(sub.created * 1000)},
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
          status = EXCLUDED.status,
          canceled_at = EXCLUDED.canceled_at,
          cancel_at_period_end = EXCLUDED.cancel_at_period_end,
          current_period_start_at = EXCLUDED.current_period_start_at,
          current_period_end_at = EXCLUDED.current_period_end_at,
          updated_at = EXCLUDED.updated_at
      `;
    }
    console.log(
      "mirrored subs",
      subs.data.map((s) => `${s.id}:${s.status}`)
    );
  }

  // Remaining stale paid?
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
  console.log("remaining stale candidates", leftover);

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
