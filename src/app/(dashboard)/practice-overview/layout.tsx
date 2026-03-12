import type { Metadata } from "next";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export const metadata: Metadata = {
  title: "CELPIP Practice by Skill | Listening, Reading, Writing & Speaking",
  description:
    "Practice CELPIP tasks by skill with realistic timed exercises. Choose Listening, Reading, Writing, or Speaking to focus on your weakest area and build exam confidence before test day.",
  alternates: {
    canonical: `${BASE_URL}/practice-overview`,
  },
  openGraph: {
    title: "CELPIP Practice by Skill | Listening, Reading, Writing & Speaking",
    description:
      "Practice CELPIP tasks by skill with realistic timed exercises. Choose Listening, Reading, Writing, or Speaking to focus on your weakest area and build exam confidence before test day.",
    url: `${BASE_URL}/practice-overview`,
    siteName: "CELPIP Practice Test",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CELPIP Practice by Skill | Listening, Reading, Writing & Speaking",
    description:
      "Practice CELPIP tasks by skill with realistic timed exercises. Choose Listening, Reading, Writing, or Speaking to focus on your weakest area and build exam confidence before test day.",
  },
};

export default function PracticeOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
