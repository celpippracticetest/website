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

const USER_ID = "f7948895-fb4a-41a1-8bf3-d94563c37580";
const SUB_ID = "sub_1TnNIqHBKaYwAPUKYuWZuN7a";
const EMAIL = "aasthamaheta00000@gmail.com";

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { data: userData, error: getErr } = await admin.auth.admin.getUserById(
    USER_ID
  );
  if (getErr) throw getErr;
  const user = userData.user;
  const app = { ...(user.app_metadata || {}) };
  const meta = { ...(user.user_metadata || {}) };

  app.plan = "free";
  app.planType = "";
  app.planCancelled = false;
  app.planExpiresAt = null;
  app.planRenewsAt = null;

  const { error: updErr } = await admin.auth.admin.updateUserById(USER_ID, {
    app_metadata: app,
    user_metadata: meta,
  });
  if (updErr) throw updErr;
  console.log("auth app_metadata updated");

  const publicMetadata = {
    ...app,
    ...meta,
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
    WHERE supabase_auth_user_id = ${USER_ID}::uuid
       OR lower(email) = lower(${EMAIL})
  `;
  console.log("user_profiles updated");

  const live = await stripe.subscriptions.retrieve(SUB_ID);
  const firstPrice = live.items?.data?.[0]?.price;
  const customerId =
    typeof live.customer === "string" ? live.customer : live.customer?.id || null;
  const periodEnd =
    live.items?.data?.[0]?.current_period_end ??
    live.current_period_end ??
    null;
  const periodStart =
    live.items?.data?.[0]?.current_period_start ??
    live.current_period_start ??
    null;

  await sql`
    UPDATE public.stripe_subscriptions
    SET
      status = ${live.status},
      customer_id = ${customerId},
      canceled_at = ${live.canceled_at ? new Date(live.canceled_at * 1000) : null},
      cancel_at_period_end = ${Boolean(live.cancel_at_period_end)},
      current_period_start_at = ${periodStart ? new Date(periodStart * 1000) : null},
      current_period_end_at = ${periodEnd ? new Date(periodEnd * 1000) : null},
      price_id = ${firstPrice?.id || null},
      interval = ${firstPrice?.recurring?.interval || null},
      interval_count = ${firstPrice?.recurring?.interval_count || null},
      metadata = ${JSON.stringify(live.metadata || {})}::jsonb,
      updated_at = now()
    WHERE stripe_id = ${SUB_ID}
  `;
  console.log("stripe_subscriptions updated");

  // Verify
  const auth = await sql`
    SELECT raw_app_meta_data->>'plan' AS plan,
           raw_app_meta_data->>'planType' AS plan_type,
           raw_app_meta_data->>'planCancelled' AS plan_cancelled
    FROM auth.users WHERE id = ${USER_ID}::uuid
  `;
  const profile = await sql`
    SELECT plan, plan_type, public_metadata->>'planCancelled' AS plan_cancelled
    FROM public.user_profiles
    WHERE supabase_auth_user_id = ${USER_ID}::uuid
  `;
  const sub = await sql`
    SELECT status, cancel_at_period_end, canceled_at
    FROM public.stripe_subscriptions
    WHERE stripe_id = ${SUB_ID}
  `;
  console.log("verify", { auth, profile, sub });

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
