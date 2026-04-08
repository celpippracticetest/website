import type { User } from "@clerk/nextjs/server";

/** All signed-in users must complete `onboardingNew` once (`/onboarding-survey`). */
export function userNeedsOnboardingSurvey(
  user: User | null | undefined,
): boolean {
  if (!user) return false;
  const completed = (
    user.privateMetadata as { onboardingNew?: { completed?: boolean } } | undefined
  )?.onboardingNew?.completed;
  return completed !== true;
}
