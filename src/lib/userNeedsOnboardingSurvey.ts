import type { User } from "@clerk/nextjs/server";

/** True until `onboardingNew.completed` (survey submitted or skipped). Used only by `/onboarding-survey`. */
export function userNeedsOnboardingSurvey(
  user: User | null | undefined,
): boolean {
  if (!user) return false;
  const completed = (
    user.privateMetadata as { onboardingNew?: { completed?: boolean } } | undefined
  )?.onboardingNew?.completed;
  return completed !== true;
}
