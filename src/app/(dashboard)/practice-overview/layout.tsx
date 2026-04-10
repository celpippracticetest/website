import type { Metadata } from "next";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

const PRACTICE_OVERVIEW_TITLE =
  "CELPIP Practice Test Online — Sample Tasks by Skill";
const PRACTICE_OVERVIEW_DESCRIPTION =
  "Free CELPIP practice test hub: timed sample tasks for Listening, Reading, Writing, and Speaking. Compare CELPIP-General vs LS prep paths, pick skills to drill, and build stamina before your exam.";

export const metadata: Metadata = {
  title: PRACTICE_OVERVIEW_TITLE,
  description: PRACTICE_OVERVIEW_DESCRIPTION,
  alternates: {
    canonical: `${BASE_URL}/practice-overview`,
  },
  openGraph: {
    title: PRACTICE_OVERVIEW_TITLE,
    description: PRACTICE_OVERVIEW_DESCRIPTION,
    url: `${BASE_URL}/practice-overview`,
    siteName: "CELPIP Practice Test",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PRACTICE_OVERVIEW_TITLE,
    description: PRACTICE_OVERVIEW_DESCRIPTION,
  },
};

export default function PracticeOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
