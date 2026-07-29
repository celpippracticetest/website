-- Typed activity tables (retire app_documents partitions: useractivities,
-- user_learning_events, useractivityreminders).

CREATE TABLE IF NOT EXISTS public.user_activities (
  id bigserial PRIMARY KEY,
  mongo_id text UNIQUE,
  user_id text NOT NULL,
  email text,
  event_type text NOT NULL,
  context text NOT NULL,
  skill text,
  attempt_id text,
  content_id text,
  status text,
  duration_seconds integer,
  score_overall double precision,
  score_breakdown_json text,
  llm_tokens_prompt integer NOT NULL DEFAULT 0,
  llm_tokens_completion integer NOT NULL DEFAULT 0,
  ip_address text,
  user_agent text,
  device_ua_hash text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp_utc timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activities_timestamp_utc_idx
  ON public.user_activities (timestamp_utc DESC);

CREATE INDEX IF NOT EXISTS user_activities_user_id_timestamp_idx
  ON public.user_activities (user_id, timestamp_utc DESC);

CREATE INDEX IF NOT EXISTS user_activities_event_type_timestamp_idx
  ON public.user_activities (event_type, timestamp_utc DESC);

CREATE INDEX IF NOT EXISTS user_activities_skill_event_type_idx
  ON public.user_activities (skill, event_type)
  WHERE skill IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_learning_events (
  id bigserial PRIMARY KEY,
  mongo_id text UNIQUE,
  user_id text NOT NULL,
  event_type text NOT NULL,
  context text,
  score double precision,
  device_type text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_learning_events_user_id_occurred_idx
  ON public.user_learning_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS user_learning_events_occurred_at_idx
  ON public.user_learning_events (occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.user_activity_reminders (
  id bigserial PRIMARY KEY,
  mongo_id text UNIQUE,
  user_id text NOT NULL UNIQUE,
  last_engaged_at timestamptz,
  reminder_flow text,
  reminder_stage text,
  reminder_stage_index integer,
  reminder_variant text,
  reminder_window_started_at timestamptz,
  reminders_in_window integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_reminders_last_engaged_idx
  ON public.user_activity_reminders (last_engaged_at DESC NULLS LAST);
