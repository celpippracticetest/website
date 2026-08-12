require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const authId = "1705e47c-9d3b-4575-9584-3b7ef2240ea3";
const email = "oliveranogic@gmail.com";

(async () => {
  // Legacy app_documents path metrics (what old CMS code used)
  const legacy = await sql`
    SELECT
      body->>'userId' AS user_id,
      COUNT(*)::int AS total_activities,
      COUNT(*) FILTER (WHERE body->>'eventType' = 'practice_attempt_started')::int AS practice_attempts,
      COUNT(*) FILTER (WHERE body->>'eventType' = 'practice_attempt_completed')::int AS practice_completions,
      COUNT(*) FILTER (WHERE body->>'eventType' = 'mock_attempt_started')::int AS mock_attempts,
      COUNT(*) FILTER (WHERE body->>'eventType' = 'mock_attempt_completed')::int AS mock_completions,
      COALESCE(
        SUM(
          COALESCE(NULLIF(TRIM(body->>'llmTokensPrompt'), '')::int, 0)
          + COALESCE(NULLIF(TRIM(body->>'llmTokensCompletion'), '')::int, 0)
        ),
        0
      ) AS total_tokens,
      COUNT(DISTINCT NULLIF(TRIM(body->>'ipAddress'), ''))::int AS ips,
      COUNT(DISTINCT NULLIF(TRIM(body->>'userAgent'), ''))::int AS uas
    FROM public.app_documents
    WHERE collection = 'useractivities'
      AND (
        body->>'userId' = ${authId}
        OR lower(coalesce(body->>'email','')) = lower(${email})
      )
    GROUP BY body->>'userId'
  `;
  console.log("legacy app_documents useractivities:", legacy);

  // Check partition key resolution
  const partitions = await sql`
    SELECT DISTINCT collection, count(*)::int AS c
    FROM public.app_documents
    WHERE collection ILIKE '%useractivit%'
    GROUP BY collection
  `;
  console.log("partitions:", partitions);

  // What if CMS resolves partition key to prod.user_activity which is empty?
  const prod = await sql`
    SELECT count(*)::int AS c
    FROM public.app_documents
    WHERE collection = 'prod.user_activity'
      AND (body->>'userId' = ${authId} OR lower(coalesce(body->>'email','')) = lower(${email}))
  `;
  console.log("prod.user_activity for user:", prod[0]);

  // Stress test ARRAY_AGG with a full page of ids
  const pageIds = await sql`
    SELECT DISTINCT user_id FROM public.user_activities ORDER BY user_id LIMIT 60
  `;
  const ids = pageIds.map((r) => r.user_id);
  console.log("stress ids:", ids.length);
  try {
    const t0 = Date.now();
    const rows = await sql`
      SELECT
        user_id,
        COUNT(*)::int AS total_activities,
        (
          ARRAY_AGG(DISTINCT NULLIF(TRIM(ip_address), ''))
          FILTER (WHERE NULLIF(TRIM(ip_address), '') IS NOT NULL)
        )[1:5] AS ip_addresses,
        (
          ARRAY_AGG(DISTINCT NULLIF(TRIM(user_agent), ''))
          FILTER (WHERE NULLIF(TRIM(user_agent), '') IS NOT NULL)
        )[1:3] AS user_agents
      FROM public.user_activities
      WHERE user_id = ANY(${ids})
      GROUP BY user_id
    `;
    console.log("stress OK rows=", rows.length, "ms=", Date.now() - t0);
  } catch (e) {
    console.error("stress FAILED:", e.message);
  }

  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});
