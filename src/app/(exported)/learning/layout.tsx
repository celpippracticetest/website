import LayoutLearningClient from "@/components/dashboard-new/LayoutLearningClient";
import IntercomLoader from "@/components/IntercomLoader";
import { currentUser } from "@/lib/auth/web-auth-session";
import { shouldShowOnboardingSurvey } from "@/lib/onboardingSurveyVisibility";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/learning");

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  try {
    user = await currentUser();
  } catch (error) {}

  const showSurvey = shouldShowOnboardingSurvey(user);

  return (
    <>
      <IntercomLoader />
      <LayoutLearningClient showSurvey={showSurvey} children={children} />
    </>
  );
}
