import type { MobileUserBridge } from "@/lib/auth/supabase-mobile-user-bridge";

/** True until `onboardingNew.completed` (survey submitted or skipped). Used only by `/onboarding-survey`. */
export function userNeedsOnboardingSurvey(
  user: MobileUserBridge | null | undefined,
): boolean {
  if (!user) return false;
  const completed = (
    user.publicMetadata as { onboardingNew?: { completed?: boolean } } | undefined
  )?.onboardingNew?.completed;
  return completed !== true;
}
