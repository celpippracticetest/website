import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
const sql = postgres(url, {
  max: 1,
  prepare: false,
  ssl: "require",
  connect_timeout: 20,
  idle_timeout: 180,
});

const COMBINED = `
  SELECT
    COALESCE(
      NULLIF(TRIM(p.legacy_clerk_user_id), ''),
      NULLIF(TRIM(p.supabase_auth_user_id::text), ''),
      p.id::text
    ) AS stable_id,
    p.supabase_auth_user_id::text AS supabase_auth_user_id,
    p.legacy_clerk_user_id,
    p.id::text AS profile_id,
    COALESCE(NULLIF(TRIM(p.email), ''), au.email) AS email,
    COALESCE(
      NULLIF(TRIM(p.first_name), ''),
      NULLIF(
        TRIM(
          COALESCE(
            au.raw_user_meta_data->>'given_name',
            au.raw_user_meta_data->>'first_name',
            split_part(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''), ' ', 1)
          )
        ),
        ''
      )
    ) AS first_name,
    COALESCE(
      NULLIF(TRIM(p.last_name), ''),
      NULLIF(
        TRIM(
          COALESCE(
            au.raw_user_meta_data->>'family_name',
            au.raw_user_meta_data->>'last_name',
            NULLIF(
              CASE
                WHEN position(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')) > 0
                THEN substr(
                  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''),
                  position(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')) + 1
                )
                ELSE NULL
              END,
              ''
            )
          )
        ),
        ''
      )
    ) AS last_name,
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
    NULL::text AS profile_id,
    au.email,
    NULLIF(
      TRIM(
        COALESCE(
          au.raw_user_meta_data->>'given_name',
          au.raw_user_meta_data->>'first_name',
          split_part(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''), ' ', 1)
        )
      ),
      ''
    ) AS first_name,
    NULLIF(
      TRIM(
        COALESCE(
          au.raw_user_meta_data->>'family_name',
          au.raw_user_meta_data->>'last_name',
          NULLIF(
            CASE
              WHEN position(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')) > 0
              THEN substr(
                COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''),
                position(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')) + 1
              )
              ELSE NULL
            END,
            ''
          )
        )
      ),
      ''
    ) AS last_name,
    COALESCE(NULLIF(TRIM(au.raw_app_meta_data->>'plan'), ''), 'free') AS plan,
    NULLIF(TRIM(au.raw_app_meta_data->>'planType'), '') AS plan_type,
    COALESCE(au.raw_app_meta_data, '{}'::jsonb) AS public_metadata,
    NULLIF(TRIM(au.raw_app_meta_data->>'stripeCustomerId'), '') AS stripe_customer_id,
    au.created_at,
    COALESCE(au.last_sign_in_at, au.created_at) AS updated_at
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.supabase_auth_user_id = au.id
  )
`;

const engagement = [
  "practice_attempt_started",
  "practice_attempt_completed",
  "mock_attempt_started",
  "mock_attempt_completed",
  "login",
];

async function timed(label, fn) {
  const t0 = Date.now();
  const result = await fn();
  console.log(label, { ms: Date.now() - t0, n: Array.isArray(result) ? result.length : result?.[0] });
  return result;
}

try {
  // Mimic postgres.js parameterized ANY exactly like the app
  await timed("count_like_app", async () => {
    return sql`
      WITH combined AS (
        ${sql.unsafe(COMBINED)}
      ),
      filtered AS (
        SELECT c.*
        FROM combined c
        WHERE 1 = 1
      ),
      deduped AS (
        SELECT DISTINCT ON (stable_id)
          stable_id
        FROM filtered
        ORDER BY
          stable_id,
          (supabase_auth_user_id IS NOT NULL) DESC,
          updated_at DESC NULLS LAST
      )
      SELECT COUNT(*)::int AS c
      FROM deduped
    `;
  });

  await timed("data_like_app_lastActivity", async () => {
    return sql`
      WITH combined AS (
        ${sql.unsafe(COMBINED)}
      ),
      filtered AS (
        SELECT
          c.stable_id,
          c.supabase_auth_user_id,
          c.legacy_clerk_user_id,
          c.profile_id,
          c.email,
          c.first_name,
          c.last_name,
          c.plan,
          c.plan_type,
          c.public_metadata,
          c.stripe_customer_id,
          c.created_at,
          c.updated_at
        FROM combined c
        WHERE 1 = 1
      ),
      deduped AS (
        SELECT DISTINCT ON (stable_id)
          stable_id,
          supabase_auth_user_id,
          legacy_clerk_user_id,
          profile_id,
          email,
          first_name,
          last_name,
          plan,
          plan_type,
          public_metadata,
          stripe_customer_id,
          created_at,
          updated_at
        FROM filtered
        ORDER BY
          stable_id,
          (supabase_auth_user_id IS NOT NULL) DESC,
          updated_at DESC NULLS LAST
      ),
      activity_by_id AS (
        SELECT
          ua.user_id,
          COALESCE(
            SUM(
              COALESCE(ua.llm_tokens_prompt, 0) + COALESCE(ua.llm_tokens_completion, 0)
            ),
            0
          )::bigint AS total_tokens,
          MAX(ua.timestamp_utc) FILTER (
            WHERE ua.event_type = ANY(${engagement})
          ) AS last_activity
        FROM public.user_activities ua
        WHERE ua.user_id IN (
          SELECT f.stable_id FROM deduped f
          UNION
          SELECT f.supabase_auth_user_id FROM deduped f
          WHERE f.supabase_auth_user_id IS NOT NULL
          UNION
          SELECT f.legacy_clerk_user_id FROM deduped f
          WHERE NULLIF(TRIM(f.legacy_clerk_user_id), '') IS NOT NULL
          UNION
          SELECT f.profile_id FROM deduped f
          WHERE f.profile_id IS NOT NULL
        )
        GROUP BY ua.user_id
      )
      SELECT
        f.stable_id,
        f.email,
        COALESCE(
          (
            SELECT SUM(a.total_tokens)
            FROM activity_by_id a
            WHERE a.user_id = f.stable_id
               OR (
                 f.supabase_auth_user_id IS NOT NULL
                 AND a.user_id = f.supabase_auth_user_id
               )
               OR (
                 NULLIF(TRIM(f.legacy_clerk_user_id), '') IS NOT NULL
                 AND a.user_id = f.legacy_clerk_user_id
               )
               OR (
                 f.profile_id IS NOT NULL
                 AND a.user_id = f.profile_id
               )
          ),
          0
        ) AS sort_total_tokens,
        (
          SELECT MAX(a.last_activity)
          FROM activity_by_id a
          WHERE a.user_id = f.stable_id
             OR (
               f.supabase_auth_user_id IS NOT NULL
               AND a.user_id = f.supabase_auth_user_id
             )
             OR (
               NULLIF(TRIM(f.legacy_clerk_user_id), '') IS NOT NULL
               AND a.user_id = f.legacy_clerk_user_id
             )
             OR (
               f.profile_id IS NOT NULL
               AND a.user_id = f.profile_id
             )
        ) AS sort_last_activity
      FROM deduped f
      ORDER BY sort_last_activity DESC NULLS LAST, stable_id
      LIMIT ${20}
      OFFSET ${0}
    `;
  });
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
