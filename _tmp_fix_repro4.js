require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const email = "oliveranogic@gmail.com";
const authId = "1705e47c-9d3b-4575-9584-3b7ef2240ea3";
const profileId = "616cbea3-9dea-4fa8-a406-7958faf8bf63";

(async () => {
  const users = await sql`
    SELECT mongo_id, collection,
      body->>'email' AS email,
      body->>'supabaseUserId' AS supabase_user_id,
      body->>'clerkUserId' AS clerk_user_id,
      body->>'sub' AS sub,
      body->>'plan' AS plan,
      body->>'userId' AS user_id
    FROM public.app_documents
    WHERE collection IN ('users', 'user')
      AND (
        lower(coalesce(body->>'email','')) = lower(${email})
        OR body->>'supabaseUserId' = ${authId}
        OR body->>'sub' = ${authId}
        OR mongo_id = ${authId}
        OR mongo_id = ${profileId}
        OR body->>'userId' = ${authId}
      )
    LIMIT 20
  `;
  console.log("users docs:", JSON.stringify(users, null, 2));

  // Test if the new lastActivity sort SQL works (the uncommitted change)
  const engagement = [
    "practice_attempt_started",
    "practice_attempt_completed",
    "mock_attempt_started",
    "mock_attempt_completed",
    "login",
  ];
  try {
    const t0 = Date.now();
    const rows = await sql`
      WITH combined AS (
        SELECT
          COALESCE(
            NULLIF(TRIM(p.legacy_clerk_user_id), ''),
            NULLIF(TRIM(p.supabase_auth_user_id::text), ''),
            p.id::text
          ) AS stable_id,
          p.supabase_auth_user_id::text AS supabase_auth_user_id,
          p.legacy_clerk_user_id,
          COALESCE(NULLIF(TRIM(p.email), ''), au.email) AS email,
          p.plan,
          p.created_at,
          COALESCE(p.updated_at, au.last_sign_in_at, au.created_at) AS updated_at
        FROM public.user_profiles p
        LEFT JOIN auth.users au ON au.id = p.supabase_auth_user_id
      ),
      filtered AS (
        SELECT * FROM combined c
        WHERE lower(coalesce(c.email,'')) ILIKE lower(${"%" + email + "%"})
      ),
      deduped AS (
        SELECT DISTINCT ON (stable_id) * FROM filtered
        ORDER BY stable_id, (supabase_auth_user_id IS NOT NULL) DESC, updated_at DESC NULLS LAST
      ),
      activity_by_id AS (
        SELECT
          ua.user_id,
          COALESCE(SUM(COALESCE(ua.llm_tokens_prompt, 0) + COALESCE(ua.llm_tokens_completion, 0)), 0)::bigint AS total_tokens,
          MAX(ua.timestamp_utc) FILTER (
            WHERE ua.event_type = ANY(${engagement})
          ) AS last_activity
        FROM public.user_activities ua
        WHERE ua.user_id IN (
          SELECT f.stable_id FROM deduped f
          UNION
          SELECT f.supabase_auth_user_id FROM deduped f WHERE f.supabase_auth_user_id IS NOT NULL
          UNION
          SELECT f.legacy_clerk_user_id FROM deduped f WHERE NULLIF(TRIM(f.legacy_clerk_user_id), '') IS NOT NULL
        )
        GROUP BY ua.user_id
      )
      SELECT
        f.stable_id,
        f.email,
        (
          SELECT MAX(a.last_activity)
          FROM activity_by_id a
          WHERE a.user_id = f.stable_id
             OR (f.supabase_auth_user_id IS NOT NULL AND a.user_id = f.supabase_auth_user_id)
        ) AS sort_last_activity,
        COALESCE((
          SELECT SUM(a.total_tokens) FROM activity_by_id a
          WHERE a.user_id = f.stable_id
             OR (f.supabase_auth_user_id IS NOT NULL AND a.user_id = f.supabase_auth_user_id)
        ), 0) AS sort_total_tokens
      FROM deduped f
    `;
    console.log("sort SQL OK", Date.now() - t0, "ms", rows);
  } catch (e) {
    console.error("sort SQL FAILED:", e.message);
  }

  // Full-page lastActivity sort cost (no search) - this is now default!
  try {
    const t0 = Date.now();
    const rows = await sql`
      WITH combined AS (
        SELECT
          COALESCE(
            NULLIF(TRIM(p.legacy_clerk_user_id), ''),
            NULLIF(TRIM(p.supabase_auth_user_id::text), ''),
            p.id::text
          ) AS stable_id,
          p.supabase_auth_user_id::text AS supabase_auth_user_id,
          p.legacy_clerk_user_id,
          p.email,
          p.updated_at
        FROM public.user_profiles p
      ),
      deduped AS (
        SELECT DISTINCT ON (stable_id) * FROM combined
        ORDER BY stable_id, (supabase_auth_user_id IS NOT NULL) DESC, updated_at DESC NULLS LAST
      ),
      activity_by_id AS (
        SELECT
          ua.user_id,
          COALESCE(SUM(COALESCE(ua.llm_tokens_prompt, 0) + COALESCE(ua.llm_tokens_completion, 0)), 0)::bigint AS total_tokens,
          MAX(ua.timestamp_utc) FILTER (WHERE ua.event_type = ANY(${engagement})) AS last_activity
        FROM public.user_activities ua
        WHERE ua.user_id IN (
          SELECT f.stable_id FROM deduped f
          UNION SELECT f.supabase_auth_user_id FROM deduped f WHERE f.supabase_auth_user_id IS NOT NULL
          UNION SELECT f.legacy_clerk_user_id FROM deduped f WHERE NULLIF(TRIM(f.legacy_clerk_user_id), '') IS NOT NULL
        )
        GROUP BY ua.user_id
      )
      SELECT f.stable_id, f.email,
        (SELECT MAX(a.last_activity) FROM activity_by_id a
          WHERE a.user_id = f.stable_id OR (f.supabase_auth_user_id IS NOT NULL AND a.user_id = f.supabase_auth_user_id)
        ) AS sort_last_activity
      FROM deduped f
      ORDER BY sort_last_activity DESC NULLS LAST, stable_id
      LIMIT 20
    `;
    console.log("full page sort OK", Date.now() - t0, "ms", "rows", rows.length);
    const oliver = rows.find((r) => (r.email || "").toLowerCase() === email);
    console.log("oliver on first page?", Boolean(oliver), oliver);
  } catch (e) {
    console.error("full page sort FAILED:", e.message);
  }

  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});
