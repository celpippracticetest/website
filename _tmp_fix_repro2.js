require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const email = "oliveranogic@gmail.com";

(async () => {
  const exists = await sql`SELECT to_regclass('public.user_activities') IS NOT NULL AS exists`;
  console.log("table exists:", exists[0]);

  const dataRows = await sql`
    SELECT
      COALESCE(
        NULLIF(TRIM(p.legacy_clerk_user_id), ''),
        NULLIF(TRIM(p.supabase_auth_user_id::text), ''),
        p.id::text
      ) AS stable_id,
      p.legacy_clerk_user_id,
      p.supabase_auth_user_id::text AS supabase_auth_user_id,
      p.id::text AS profile_id,
      p.email
    FROM public.user_profiles p
    WHERE p.email ILIKE ${"%" + email + "%"}
    LIMIT 5
  `;
  console.log("profiles:", dataRows);

  const batchIds = [
    ...new Set(
      dataRows.flatMap((r) => [
        r.stable_id,
        r.legacy_clerk_user_id,
        r.supabase_auth_user_id,
      ]).filter(Boolean)
    ),
  ];
  console.log("batchIds:", batchIds);

  // Main listView query using IN ${sql(batchIds)}
  const stats = await sql`
    SELECT
      user_id,
      COUNT(*)::int AS total_activities,
      COALESCE(
        SUM(COALESCE(llm_tokens_prompt, 0) + COALESCE(llm_tokens_completion, 0)),
        0
      ) AS total_tokens,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_attempts,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completions,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_attempts,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_completions,
      0::int AS unique_ip_addresses_count,
      0::int AS unique_user_agents_count
    FROM public.user_activities
    WHERE user_id IN ${sql(batchIds)}
    GROUP BY user_id
  `;
  console.log("main listView stats:", stats);

  // Check how many users would show 0 on a typical page because activities
  // are under auth id but somehow not linked
  const sample = await sql`
    SELECT
      p.email,
      COALESCE(
        NULLIF(TRIM(p.legacy_clerk_user_id), ''),
        NULLIF(TRIM(p.supabase_auth_user_id::text), ''),
        p.id::text
      ) AS stable_id,
      p.supabase_auth_user_id::text AS auth_id,
      p.id::text AS profile_id,
      (SELECT COUNT(*)::int FROM public.user_activities ua WHERE ua.user_id = p.id::text) AS by_profile_id,
      (SELECT COUNT(*)::int FROM public.user_activities ua WHERE ua.user_id = p.supabase_auth_user_id::text) AS by_auth_id,
      (SELECT COUNT(*)::int FROM public.user_activities ua WHERE ua.user_id = COALESCE(NULLIF(TRIM(p.legacy_clerk_user_id), ''), NULLIF(TRIM(p.supabase_auth_user_id::text), ''), p.id::text)) AS by_stable_id
    FROM public.user_profiles p
    WHERE p.email = ${email}
  `;
  console.log("id linkage:", sample);

  // How many profiles have activity only under auth id while stable_id is clerk?
  const mismatch = await sql`
    SELECT COUNT(*)::int AS c
    FROM public.user_profiles p
    WHERE p.legacy_clerk_user_id IS NOT NULL
      AND NULLIF(TRIM(p.legacy_clerk_user_id), '') IS NOT NULL
      AND p.supabase_auth_user_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_activities ua
        WHERE ua.user_id = p.supabase_auth_user_id::text
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_activities ua
        WHERE ua.user_id = p.legacy_clerk_user_id
      )
  `;
  console.log("clerk-stable but activity-on-auth only:", mismatch[0]);

  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});
