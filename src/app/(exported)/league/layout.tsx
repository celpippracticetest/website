import LayoutLeagueClient from "@/components/dashboard-new/LayoutLeagueClient";
import { Metadata } from "next";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  return {
    title: "CELPIP League: Weekly Challenges & Practice Study Progress Tracker",
    description:
      "Track weekly CELPIP study tasks, earn points, and stay motivated with a league-style progress system built for consistent exam preparation.",
    robots: getIndexingRobotsDirective(appBaseUrl),
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
