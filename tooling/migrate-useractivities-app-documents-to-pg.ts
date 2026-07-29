/**
 * Backfill public.user_activities (+ learning events / reminders) from app_documents.
 * Uses set-based INSERT…SELECT for speed.
 *
 * Usage:
 *   npm run migrate:useractivities:to-table -- --dry-run
 *   npm run migrate:useractivities:to-table
 */
import "./bootstrap-website-env";
import { closeSql, getSql } from "@/lib/pg/pool";
import { resolveAppDocumentsPartitionKey } from "@/lib/pg/pgCollection";

function parseArgs(argv: string[]) {
  return { dryRun: argv.includes("--dry-run") };
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const sql = getSql();
  try {
    const activitiesKey = await resolveAppDocumentsPartitionKey(sql, "useractivities");
    const learningKey = await resolveAppDocumentsPartitionKey(sql, "user_learning_events");
    const remindersKey = await resolveAppDocumentsPartitionKey(sql, "useractivityreminders");

    const [{ c: srcCount }] = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM app_documents WHERE collection = ${activitiesKey}
    `;
    console.log(`Source useractivities docs: ${srcCount} (collection=${activitiesKey})`);

    if (dryRun) {
      console.log("Dry-run only; no writes.");
      return;
    }

    console.log("Upserting into public.user_activities…");
    const activityResult = await sql`
      INSERT INTO public.user_activities (
        mongo_id, user_id, email, event_type, context, skill, attempt_id, content_id,
        status, duration_seconds, score_overall, score_breakdown_json,
        llm_tokens_prompt, llm_tokens_completion, ip_address, user_agent, device_ua_hash,
        notes, metadata, timestamp_utc, created_at, updated_at
      )
      SELECT
        d.mongo_id,
        NULLIF(TRIM(d.body->>'userId'), ''),
        NULLIF(TRIM(d.body->>'email'), ''),
        NULLIF(TRIM(d.body->>'eventType'), ''),
        NULLIF(TRIM(d.body->>'context'), ''),
        NULLIF(TRIM(d.body->>'skill'), ''),
        NULLIF(TRIM(d.body->>'attemptId'), ''),
        NULLIF(TRIM(d.body->>'contentId'), ''),
        NULLIF(TRIM(d.body->>'status'), ''),
        NULLIF(TRIM(d.body->>'durationSeconds'), '')::int,
        NULLIF(TRIM(d.body->>'scoreOverall'), '')::float8,
        NULLIF(TRIM(d.body->>'scoreBreakdownJson'), ''),
        COALESCE(NULLIF(TRIM(d.body->>'llmTokensPrompt'), '')::int, 0),
        COALESCE(NULLIF(TRIM(d.body->>'llmTokensCompletion'), '')::int, 0),
        NULLIF(TRIM(d.body->>'ipAddress'), ''),
        NULLIF(TRIM(d.body->>'userAgent'), ''),
        NULLIF(TRIM(d.body->>'deviceUaHash'), ''),
        NULLIF(TRIM(d.body->>'notes'), ''),
        COALESCE(d.body->'metadata', '{}'::jsonb),
        COALESCE(
          CASE
            WHEN jsonb_typeof(d.body->'timestampUtc') = 'string'
              AND NULLIF(TRIM(d.body->>'timestampUtc'), '') ~ '^[0-9]{4}-'
              THEN (d.body->>'timestampUtc')::timestamptz
            WHEN jsonb_typeof(d.body->'timestampUtc') = 'object'
              AND NULLIF(TRIM(d.body#>>'{timestampUtc,$date}'), '') ~ '^[0-9]{4}-'
              THEN (d.body#>>'{timestampUtc,$date}')::timestamptz
            ELSE NULL
          END,
          d.updated_at,
          now()
        ),
        COALESCE(d.updated_at, now()),
        COALESCE(d.updated_at, now())
      FROM app_documents d
      WHERE d.collection = ${activitiesKey}
        AND NULLIF(TRIM(d.body->>'userId'), '') IS NOT NULL
        AND NULLIF(TRIM(d.body->>'eventType'), '') IS NOT NULL
        AND NULLIF(TRIM(d.body->>'context'), '') IS NOT NULL
      ON CONFLICT (mongo_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        email = EXCLUDED.email,
        event_type = EXCLUDED.event_type,
        context = EXCLUDED.context,
        skill = EXCLUDED.skill,
        attempt_id = EXCLUDED.attempt_id,
        content_id = EXCLUDED.content_id,
        status = EXCLUDED.status,
        duration_seconds = EXCLUDED.duration_seconds,
        score_overall = EXCLUDED.score_overall,
        score_breakdown_json = EXCLUDED.score_breakdown_json,
        llm_tokens_prompt = EXCLUDED.llm_tokens_prompt,
        llm_tokens_completion = EXCLUDED.llm_tokens_completion,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        device_ua_hash = EXCLUDED.device_ua_hash,
        notes = EXCLUDED.notes,
        metadata = EXCLUDED.metadata,
        timestamp_utc = EXCLUDED.timestamp_utc,
        updated_at = EXCLUDED.updated_at
    `;
    console.log("user_activities upsert done", activityResult.count);

    console.log("Upserting into public.user_learning_events…");
    await sql`
      INSERT INTO public.user_learning_events (
        mongo_id, user_id, event_type, context, score, device_type, occurred_at, metadata, created_at, updated_at
      )
      SELECT
        d.mongo_id,
        NULLIF(TRIM(d.body->>'userId'), ''),
        NULLIF(TRIM(d.body->>'eventType'), ''),
        NULLIF(TRIM(d.body->>'context'), ''),
        NULLIF(TRIM(d.body->>'score'), '')::float8,
        NULLIF(TRIM(d.body->>'deviceType'), ''),
        COALESCE(
          CASE
            WHEN jsonb_typeof(d.body->'occurredAt') = 'string'
              AND NULLIF(TRIM(d.body->>'occurredAt'), '') ~ '^[0-9]{4}-'
              THEN (d.body->>'occurredAt')::timestamptz
            WHEN jsonb_typeof(d.body->'occurredAt') = 'object'
              AND NULLIF(TRIM(d.body#>>'{occurredAt,$date}'), '') ~ '^[0-9]{4}-'
              THEN (d.body#>>'{occurredAt,$date}')::timestamptz
            ELSE NULL
          END,
          d.updated_at,
          now()
        ),
        COALESCE(d.body->'metadata', '{}'::jsonb),
        COALESCE(d.updated_at, now()),
        COALESCE(d.updated_at, now())
      FROM app_documents d
      WHERE d.collection = ${learningKey}
        AND NULLIF(TRIM(d.body->>'userId'), '') IS NOT NULL
        AND NULLIF(TRIM(d.body->>'eventType'), '') IS NOT NULL
      ON CONFLICT (mongo_id) DO NOTHING
    `;

    console.log("Upserting into public.user_activity_reminders…");
    await sql`
      INSERT INTO public.user_activity_reminders (
        user_id, legacy_mongo_id, last_engaged_at, reminder_flow, reminder_stage_id,
        reminder_variant, reminder_window_started_at, reminders_in_window,
        created_at, updated_at
      )
      SELECT DISTINCT ON (NULLIF(TRIM(d.body->>'userId'), ''))
        NULLIF(TRIM(d.body->>'userId'), ''),
        d.mongo_id,
        COALESCE(
          CASE
            WHEN jsonb_typeof(d.body->'lastEngagedAt') = 'string'
              AND NULLIF(TRIM(d.body->>'lastEngagedAt'), '') ~ '^[0-9]{4}-'
              THEN (d.body->>'lastEngagedAt')::timestamptz
            WHEN jsonb_typeof(d.body->'lastEngagedAt') = 'object'
              AND NULLIF(TRIM(d.body#>>'{lastEngagedAt,$date}'), '') ~ '^[0-9]{4}-'
              THEN (d.body#>>'{lastEngagedAt,$date}')::timestamptz
            ELSE NULL
          END,
          d.updated_at,
          now()
        ),
        NULLIF(TRIM(d.body->>'reminderFlow'), ''),
        COALESCE(NULLIF(TRIM(d.body->>'reminderStageId'), ''), NULLIF(TRIM(d.body->>'reminderStage'), '')),
        NULLIF(TRIM(d.body->>'reminderVariant'), ''),
        CASE
          WHEN jsonb_typeof(d.body->'reminderWindowStartedAt') = 'string'
            AND NULLIF(TRIM(d.body->>'reminderWindowStartedAt'), '') ~ '^[0-9]{4}-'
            THEN (d.body->>'reminderWindowStartedAt')::timestamptz
          ELSE NULL
        END,
        COALESCE(NULLIF(TRIM(d.body->>'remindersInWindow'), '')::int, 0),
        COALESCE(d.updated_at, now()),
        COALESCE(d.updated_at, now())
      FROM app_documents d
      WHERE d.collection = ${remindersKey}
        AND NULLIF(TRIM(d.body->>'userId'), '') IS NOT NULL
      ORDER BY NULLIF(TRIM(d.body->>'userId'), ''), d.updated_at DESC
      ON CONFLICT (user_id) DO UPDATE SET
        legacy_mongo_id = COALESCE(EXCLUDED.legacy_mongo_id, public.user_activity_reminders.legacy_mongo_id),
        last_engaged_at = GREATEST(
          COALESCE(public.user_activity_reminders.last_engaged_at, '-infinity'::timestamptz),
          COALESCE(EXCLUDED.last_engaged_at, '-infinity'::timestamptz)
        ),
        updated_at = EXCLUDED.updated_at
    `;

    const [{ c: after }] = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM public.user_activities
    `;
    const [{ m: maxTs }] = await sql<{ m: Date | null }[]>`
      SELECT MAX(timestamp_utc) AS m FROM public.user_activities
    `;
    console.log(`Done. user_activities count=${after}, max timestamp=${maxTs?.toISOString?.() ?? maxTs}`);
  } finally {
    await closeSql();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
