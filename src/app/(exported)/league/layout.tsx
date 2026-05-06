import LayoutLeagueClient from "@/components/dashboard-new/LayoutLeagueClient";
import { Metadata } from "next";

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
  return (
    <>
      <LayoutLeagueClient>{children}</LayoutLeagueClient>
    </>
  );
}
