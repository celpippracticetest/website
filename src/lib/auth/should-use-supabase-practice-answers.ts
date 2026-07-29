import "server-only";

import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Practice and mock-exam answers persist in Postgres `public.answers`.
 * Always on when Supabase admin (service role) is configured; otherwise still
 * prefer answers table whenever DATABASE_URL is present so we do not fall back
 * to app_documents.
 */
export function shouldPersistAnswersInSupabase(): boolean {
  if (isSupabaseAdminConfigured()) return true;
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * @deprecated Use {@link shouldPersistAnswersInSupabase}; the `userId` argument is ignored.
 */
export function shouldUseSupabaseForPracticeAnswers(_userId: string): boolean {
  return shouldPersistAnswersInSupabase();
}
