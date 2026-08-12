require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const email = "oliveranogic@gmail.com";

(async () => {
  // Exact rollup query from userActivitiesPg.loadUserActivityMetricsByUserId
  const ids = [
    "1705e47c-9d3b-4575-9584-3b7ef2240ea3",
    "616cbea3-9dea-4fa8-a406-7958faf8bf63",
  ];

  try {
    const rows = await sql`
      SELECT
        user_id,
        COUNT(*)::int AS total_activities,
        COUNT(DISTINCT NULLIF(TRIM(ip_address), ''))::int AS unique_ips,
        COUNT(DISTINCT NULLIF(TRIM(user_agent), ''))::int AS unique_uas,
        COALESCE(SUM(COALESCE(llm_tokens_prompt, 0) + COALESCE(llm_tokens_completion, 0)), 0) AS total_tokens,
        COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_attempts,
        COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completions,
        COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_attempts,
        COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_completions,
        COUNT(*) FILTER (
          WHERE event_type IN (
            'payment_successful', 'payment_failed', 'subscription_created', 'subscription_cancelled'
          )
        )::int AS payment_events,
        COUNT(*) FILTER (
          WHERE event_type IN ('dispute_created', 'dispute_resolved')
        )::int AS dispute_events,
        (
          ARRAY_AGG(DISTINCT NULLIF(TRIM(ip_address), ''))
          FILTER (WHERE NULLIF(TRIM(ip_address), '') IS NOT NULL)
        )[1:5] AS ip_addresses,
        (
          ARRAY_AGG(DISTINCT NULLIF(TRIM(user_agent), ''))
          FILTER (WHERE NULLIF(TRIM(user_agent), '') IS NOT NULL)
        )[1:3] AS user_agents,
        MAX(timestamp_utc) AS last_activity,
        MIN(timestamp_utc) AS first_activity
      FROM public.user_activities
      WHERE user_id = ANY(${ids})
      GROUP BY user_id
    `;
    console.log("exact rollup OK:", JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error("exact rollup FAILED:", e.message);
  }

  // Simulate full listAdminUsersFromUserProfiles for search
  const COMBINED = `
  SELECT
    COALESCE(
      NULLIF(TRIM(p.legacy_clerk_user_id), ''),
      NULLIF(TRIM(p.supabase_auth_user_id::text), ''),
      p.id::text
    ) AS stable_id,
    p.supabase_auth_user_id::text AS supabase_auth_user_id,
    p.legacy_clerk_user_id,
    COALESCE(NULLIF(TRIM(p.email), ''), au.email) AS email,
    p.first_name,
    p.last_name,
    p.plan,
    p.plan_type,
    COALESCE(p.public_metadata, '{}'::jsonb) AS public_metadata,
    NULLIF(TRIM(p.stripe_customer_id), '') AS stripe_customer_id,
    COALESCE(au.created_at, p.created_at) AS created_at,
    COALESCE(p.updated_at, au.last_sign_in_at, au.created_at) AS updated_at
  FROM public.user_profiles p
  LEFT JOIN auth.users au ON au.id = p.supabase_auth_user_id
  UNION ALL
  SELECT
    au.id::text AS stable_id,
    au.id::text AS supabase_auth_user_id,
    NULL::text AS legacy_clerk_user_id,
    au.email,
    NULL::text, NULL::text,
    'free'::text, NULL::text,
    '{}'::jsonb, NULL::text,
    au.created_at,
    COALESCE(au.last_sign_in_at, au.created_at)
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.supabase_auth_user_id = au.id
  )`;

  const like = `%${email}%`;
  const dataRows = await sql.unsafe(
    `WITH combined AS (${COMBINED}),
     filtered AS (
       SELECT * FROM combined c
       WHERE lower(coalesce(c.email,'')) ILIKE lower($1)
     ),
     deduped AS (
       SELECT DISTINCT ON (stable_id) *
       FROM filtered
       ORDER BY stable_id, (supabase_auth_user_id IS NOT NULL) DESC, updated_at DESC NULLS LAST
     )
     SELECT * FROM deduped`,
    [like]
  );
  console.log("dataRows:", dataRows.map((r) => ({
    stable_id: r.stable_id,
    supabase_auth_user_id: r.supabase_auth_user_id,
    typeof_auth: typeof r.supabase_auth_user_id,
  })));

  // Check Map key matching - maybe UUID object vs string?
  const candidates = dataRows.flatMap((r) => [
    r.stable_id,
    r.supabase_auth_user_id,
    r.legacy_clerk_user_id,
  ]);
  console.log("candidates raw:", candidates);
  console.log(
    "candidates types:",
    candidates.map((c) => (c == null ? null : `${typeof c}:${c}`))
  );

  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try {
    await sql.end();
  } catch {}
  process.exit(1);
});
