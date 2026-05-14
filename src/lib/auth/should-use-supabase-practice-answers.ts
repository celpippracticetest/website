import "server-only";

import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Listening/reading practice and mock-exam L/R rows for accounts whose stable
 * document id is the Supabase Auth UUID (not a legacy Clerk-import id).
 */
export function shouldUseSupabaseForPracticeAnswers(userId: string): boolean {
  if (!isSupabaseAdminConfigured()) return false;
  return isLikelySupabaseAuthUserId(userId);
}
