import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("no DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  prepare: false,
  ssl: "require",
  connect_timeout: 20,
  // allow long EXPLAIN
  idle_timeout: 120,
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

async function timed(label, fn) {
  const t0 = Date.now();
  const result = await fn();
  console.log(label, { ms: Date.now() - t0 });
  return result;
}

try {
  await timed("count_deduped", () =>
    sql.unsafe(`
      WITH combined AS (${COMBINED}),
      deduped AS (
        SELECT DISTINCT ON (stable_id) stable_id
        FROM combined
        ORDER BY stable_id, (supabase_auth_user_id IS NOT NULL) DESC, updated_at DESC NULLS LAST
      )
      SELECT COUNT(*)::int AS c FROM deduped
    `),
  );

  await timed("page_via_reminders", () =>
    sql.unsafe(`
      WITH combined AS (${COMBINED}),
      deduped AS (
        SELECT DISTINCT ON (stable_id)
          stable_id, supabase_auth_user_id, legacy_clerk_user_id, profile_id,
          email, plan, plan_type, public_metadata, stripe_customer_id, created_at, updated_at
        FROM combined
        ORDER BY stable_id, (supabase_auth_user_id IS NOT NULL) DESC, updated_at DESC NULLS LAST
      )
      SELECT f.stable_id, f.email,
        (
          SELECT MAX(r.last_engaged_at)
          FROM public.user_activity_reminders r
          WHERE r.user_id = f.stable_id
             OR (f.supabase_auth_user_id IS NOT NULL AND r.user_id = f.supabase_auth_user_id)
             OR (NULLIF(TRIM(f.legacy_clerk_user_id), '') IS NOT NULL AND r.user_id = f.legacy_clerk_user_id)
             OR (f.profile_id IS NOT NULL AND r.user_id = f.profile_id)
        ) AS sort_last_activity
      FROM deduped f
      ORDER BY sort_last_activity DESC NULLS LAST, f.stable_id
      LIMIT 20 OFFSET 0
    `),
  );

  await timed("page_via_activity_cte_like_prod", () =>
    sql.unsafe(`
      WITH combined AS (${COMBINED}),
      deduped AS (
        SELECT DISTINCT ON (stable_id)
          stable_id, supabase_auth_user_id, legacy_clerk_user_id, profile_id,
          email, plan, plan_type, public_metadata, stripe_customer_id, created_at, updated_at
        FROM combined
        ORDER BY stable_id, (supabase_auth_user_id IS NOT NULL) DESC, updated_at DESC NULLS LAST
      ),
      activity_by_id AS (
        SELECT
          ua.user_id,
          COALESCE(SUM(COALESCE(ua.llm_tokens_prompt, 0) + COALESCE(ua.llm_tokens_completion, 0)), 0)::bigint AS total_tokens,
          MAX(ua.timestamp_utc) FILTER (
            WHERE ua.event_type = ANY(ARRAY[
              'practice_attempt_started','practice_attempt_completed',
              'mock_attempt_started','mock_attempt_completed','login'
            ])
          ) AS last_activity
        FROM public.user_activities ua
        WHERE ua.user_id IN (
          SELECT f.stable_id FROM deduped f
          UNION
          SELECT f.supabase_auth_user_id FROM deduped f WHERE f.supabase_auth_user_id IS NOT NULL
          UNION
          SELECT f.legacy_clerk_user_id FROM deduped f WHERE NULLIF(TRIM(f.legacy_clerk_user_id), '') IS NOT NULL
          UNION
          SELECT f.profile_id FROM deduped f WHERE f.profile_id IS NOT NULL
        )
        GROUP BY ua.user_id
      )
      SELECT f.stable_id, f.email,
        (
          SELECT MAX(a.last_activity)
          FROM activity_by_id a
          WHERE a.user_id = f.stable_id
             OR (f.supabase_auth_user_id IS NOT NULL AND a.user_id = f.supabase_auth_user_id)
             OR (NULLIF(TRIM(f.legacy_clerk_user_id), '') IS NOT NULL AND a.user_id = f.legacy_clerk_user_id)
             OR (f.profile_id IS NOT NULL AND a.user_id = f.profile_id)
        ) AS sort_last_activity
      FROM deduped f
      ORDER BY sort_last_activity DESC NULLS LAST, f.stable_id
      LIMIT 20 OFFSET 0
    `),
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
