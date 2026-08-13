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
});

async function timed(label, fn) {
  const t0 = Date.now();
  const result = await fn();
  console.log(label, { ms: Date.now() - t0, result });
  return result;
}

try {
  await timed("sizes", () =>
    sql`
      SELECT relname, n_live_tup::bigint AS est_rows
      FROM pg_stat_user_tables
      WHERE relname IN ('user_activities', 'user_profiles', 'user_activity_reminders')
      ORDER BY relname
    `,
  );

  await timed("reminders", () =>
    sql`
      SELECT
        COUNT(*)::int AS c,
        COUNT(last_engaged_at)::int AS with_engaged
      FROM public.user_activity_reminders
    `,
  );

  await timed("activities_count", () =>
    sql`SELECT COUNT(*)::int AS c FROM public.user_activities`,
  );

  await timed("profiles_count", () =>
    sql`SELECT COUNT(*)::int AS c FROM public.user_profiles`,
  );

  await timed("engagement_agg", () =>
    sql`
      SELECT COUNT(*)::int AS users_with_activity
      FROM (
        SELECT user_id
        FROM public.user_activities
        WHERE event_type = ANY(ARRAY[
          'practice_attempt_started',
          'practice_attempt_completed',
          'mock_attempt_started',
          'mock_attempt_completed',
          'login'
        ])
        GROUP BY user_id
      ) s
    `,
  );

  await timed("last_activity_via_reminders_top20", () =>
    sql`
      SELECT user_id, last_engaged_at
      FROM public.user_activity_reminders
      WHERE last_engaged_at IS NOT NULL
      ORDER BY last_engaged_at DESC NULLS LAST
      LIMIT 20
    `,
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
