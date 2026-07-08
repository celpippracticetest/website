import type { MobileUserBridge } from "@/lib/auth/supabase-mobile-user-bridge";

type OnboardingNewMeta = {
  completed?: boolean;
  askedLaterAt?: string;
  skippedAt?: string;
};

/** Whether the post-signup onboarding survey overlay should show for this user. */
export function shouldShowOnboardingSurvey(
  user: MobileUserBridge | null | undefined,
): boolean {
  if (!user) return false;

  const plan = user.publicMetadata?.plan;
  if (plan !== "free") return false;

  const onboardingNew =
    (user.privateMetadata?.onboardingNew as OnboardingNewMeta | undefined) ?? {};

  const dismissed =
    onboardingNew.completed === true ||
    Boolean(onboardingNew.askedLaterAt) ||
    Boolean(onboardingNew.skippedAt);

  return !dismissed;
}
