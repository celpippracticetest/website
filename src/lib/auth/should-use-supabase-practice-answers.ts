import "server-only";

import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * When the service-role Supabase client is configured, practice and mock-exam
 * answers are persisted in Postgres `public.answers` instead of `app_documents`.
 */
export function shouldPersistAnswersInSupabase(): boolean {
  return isSupabaseAdminConfigured();
}

/**
 * @deprecated Use {@link shouldPersistAnswersInSupabase}; the `userId` argument is ignored.
 */
export function shouldUseSupabaseForPracticeAnswers(_userId: string): boolean {
  return shouldPersistAnswersInSupabase();
}
