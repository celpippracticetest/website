import LayoutLeagueClient from "@/components/dashboard-new/LayoutLeagueClient";
import { userNeedsOnboardingSurvey } from "@/lib/userNeedsOnboardingSurvey";
import { currentUser } from "@clerk/nextjs/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "CELPIP League: Weekly Challenges & Practice Study Progress Tracker",
    description:
      "Track weekly CELPIP study tasks, earn points, and stay motivated with a league-style progress system built for consistent exam preparation.",
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

  if (userNeedsOnboardingSurvey(user ?? undefined)) {
    redirect("/onboarding-survey");
  }

  return (
    <>
      <LayoutLeagueClient>{children}</LayoutLeagueClient>
    </>
  );
}
