import LayoutLearningClient from "@/components/dashboard-new/LayoutLearningClient";
import { daysSince } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "https://celpippracticetest.com";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "CELPIP AI Learning Assistant | Ask & Get Exam Strategies",
    description:
      "Get personalized CELPIP study help from an AI learning assistant. Ask about Speaking, Writing, Listening, and Reading strategies to get targeted feedback and hit CLB 9+.",
    alternates: {
      canonical: `${appBaseUrl}/learning`,
    },
    openGraph: {
      title: "CELPIP AI Learning Assistant | Ask & Get Exam Strategies",
      description:
        "Get personalized CELPIP study help from an AI learning assistant. Ask about Speaking, Writing, Listening, and Reading strategies to get targeted feedback and hit CLB 9+.",
      url: `${appBaseUrl}/learning`,
      siteName: "CELPIP Practice Test",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "CELPIP AI Learning Assistant | Ask & Get Exam Strategies",
      description:
        "Get personalized CELPIP study help from an AI learning assistant. Ask about Speaking, Writing, Listening, and Reading strategies to get targeted feedback and hit CLB 9+.",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}
type OnboardingMetadata = {
  completed?: boolean;
  askedLaterAt?: string;
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  try {
    user = await currentUser();
  } catch (error) {}

  const publicMetadata = user?.publicMetadata || {};
  const privateMetadata = user?.privateMetadata || {};

  const onboarding: OnboardingMetadata = privateMetadata.onboarding || {};
  const onboardingNew: any = privateMetadata.onboardingNew || {};

  const showSurvey =
    publicMetadata.plan === "free" &&
    onboardingNew.completed !== true &&
    (!onboardingNew.askedLaterAt || daysSince(onboardingNew.askedLaterAt) >= 7);

  const showCompletedModal =
    !showSurvey &&
    publicMetadata.plan === "free" &&
    (onboardingNew.completed === true ||
      (onboardingNew.askedLaterAt && daysSince(onboardingNew.askedLaterAt) < 7));
  return (
    <>
      <LayoutLearningClient
        showSurvey={showSurvey}
        showCompletedModal={showCompletedModal}
        children={children}
      />
    </>
  );
}
