import type { MobileUserBridge } from "@/lib/auth/supabase-mobile-user-bridge";

/** True until onboarding survey is submitted or skipped. */
export function userNeedsOnboardingSurvey(
  user: MobileUserBridge | null | undefined,
): boolean {
  if (!user) return false;
  const onboardingNew = user.privateMetadata?.onboardingNew as
    | { completed?: boolean; askedLaterAt?: string; skippedAt?: string }
    | undefined;
  if (!onboardingNew) return true;
  if (onboardingNew.completed === true) return false;
  if (onboardingNew.askedLaterAt || onboardingNew.skippedAt) return false;
  return true;
}
