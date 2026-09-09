import LayoutClient from "@/components/dashboard-new/LayoutClient";
import { currentUser } from "@/lib/auth/web-auth-session";
import { shouldShowOnboardingSurvey } from "@/lib/onboardingSurveyVisibility";
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

  return <LayoutClient showSurvey={showSurvey} children={children} />;
}
