import LayoutLearningClient from "@/components/dashboard-new/LayoutLearningClient";
import { daysSince } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CELPIP AI Learning Assistant | Real-time Practice Feedback",
  description:
    "Ask CELPIP-style questions and get real-time answers. Practice CELPIP strategies, improve task structure, and get targeted guidance.",
  alternates: {
    canonical: "https://celpippracticetest.com/learning",
  },
};

type OnboardingMetadata = {
  completed?: boolean;
  askedLaterAt?: string;
};

export default async function LearningLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  try {
    user = await currentUser();
  } catch {
    // ignore
  }

  const publicMetadata = user?.publicMetadata || {};
  const privateMetadata = user?.privateMetadata || {};

  const onboarding: OnboardingMetadata = privateMetadata.onboarding || {};
  const onboardingNew: Record<string, unknown> =
    (privateMetadata.onboardingNew as Record<string, unknown>) || {};

  const showSurvey =
    publicMetadata.plan === "free" &&
    onboardingNew.completed !== true &&
    (!onboardingNew.askedLaterAt ||
      daysSince(onboardingNew.askedLaterAt as string) >= 7);

  const showCompletedModal =
    !showSurvey &&
    publicMetadata.plan === "free" &&
    (onboardingNew.completed === true ||
      (onboardingNew.askedLaterAt &&
        daysSince(onboardingNew.askedLaterAt as string) < 7));

  return (
    <LayoutLearningClient
      showSurvey={showSurvey}
      showCompletedModal={showCompletedModal}
    >
      {children}
    </LayoutLearningClient>
  );
}
