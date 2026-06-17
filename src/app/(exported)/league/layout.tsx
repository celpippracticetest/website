import LayoutLeagueClient from "@/components/dashboard-new/LayoutLeagueClient";
import IntercomLoader from "@/components/IntercomLoader";
import { daysSince } from "@/lib/utils";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "Dashboard",
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
      <IntercomLoader />
      <LayoutLeagueClient
        showSurvey={showSurvey}
        showCompletedModal={showCompletedModal}
        children={children}
      />
    </>
  );
}
