-- Allow multiple writing/speaking practice submissions per user+practice.
-- Listening/reading still collapse to one row via empty attempt_key.

DROP INDEX IF EXISTS public.answers_uq_practice;

CREATE UNIQUE INDEX IF NOT EXISTS answers_uq_practice_attempt
ON public.answers (user_id, practice_id, attempt_key)
WHERE practice_id IS NOT NULL;
