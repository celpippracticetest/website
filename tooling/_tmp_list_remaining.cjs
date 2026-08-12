const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

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
  const rows = await sql`
    SELECT
      p.email,
      p.plan,
      p.plan_type,
      p.supabase_auth_user_id,
      p.stripe_customer_id,
      p.public_metadata->>'planCancelled' AS plan_cancelled,
      p.public_metadata->>'planExpiresAt' AS plan_expires_at,
      p.public_metadata->>'planOverrideSource' AS override_source,
      ss.status AS stripe_status,
      ss.cancel_at_period_end,
      ss.current_period_end_at,
      ss.stripe_id
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
    ORDER BY p.email
  `;
  console.log("remaining", rows.length);
  console.log(JSON.stringify(rows, null, 2));
  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
