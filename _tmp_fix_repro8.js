require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });

const engagementEventTypes = [
  "practice_attempt_started",
  "practice_attempt_completed",
  "mock_attempt_started",
  "mock_attempt_completed",
  "login",
];

(async () => {
  // Simulate a full default page (sort lastActivity): get 20 users then load metrics
  const page = await sql`
    SELECT
      COALESCE(
        NULLIF(TRIM(p.legacy_clerk_user_id), ''),
        NULLIF(TRIM(p.supabase_auth_user_id::text), ''),
        p.id::text
      ) AS stable_id,
      p.supabase_auth_user_id::text AS supabase_auth_user_id,
      p.legacy_clerk_user_id,
      p.email
    FROM public.user_profiles p
    ORDER BY p.updated_at DESC NULLS LAST
    LIMIT 20
  `;

  const ids = [
    ...new Set(
      page.flatMap((r) => [r.stable_id, r.supabase_auth_user_id, r.legacy_clerk_user_id]).filter(Boolean)
    ),
  ];
  console.log("page users", page.length, "candidate ids", ids.length);

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
        (
          ARRAY_AGG(DISTINCT NULLIF(TRIM(ip_address), ''))
          FILTER (WHERE NULLIF(TRIM(ip_address), '') IS NOT NULL)
        )[1:5] AS ip_addresses,
        (
          ARRAY_AGG(DISTINCT NULLIF(TRIM(user_agent), ''))
          FILTER (WHERE NULLIF(TRIM(user_agent), '') IS NOT NULL)
        )[1:3] AS user_agents,
        MAX(timestamp_utc) FILTER (
          WHERE event_type = ANY(${engagementEventTypes})
        ) AS last_activity,
        MIN(timestamp_utc) AS first_activity
      FROM public.user_activities
      WHERE user_id = ANY(${ids})
      GROUP BY user_id
    `;
    console.log("metrics rows", rows.length);
    console.log(
      "sample",
      rows.slice(0, 3).map((r) => ({
        user_id: r.user_id,
        practice_attempts: r.practice_attempts,
        tokens: r.total_tokens,
        ips: r.unique_ips,
      }))
    );

    // How many of the 20 page users have zero metrics after merge?
    let zeros = 0;
    let nonzero = 0;
    for (const u of page) {
      const matched = rows.filter(
        (r) =>
          r.user_id === u.stable_id ||
          r.user_id === u.supabase_auth_user_id ||
          r.user_id === u.legacy_clerk_user_id
      );
      const practice = matched.reduce((s, r) => s + r.practice_attempts, 0);
      if (practice === 0 && matched.reduce((s, r) => s + Number(r.total_tokens), 0) === 0) zeros++;
      else nonzero++;
    }
    console.log({ zeros, nonzero });
  } catch (e) {
    console.error("QUERY FAILED:", e.message);
  }

  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});
