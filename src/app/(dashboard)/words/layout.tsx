import type { Metadata } from "next";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export const metadata: Metadata = {
  title: "CELPIP Vocabulary Tracker | Learn & Master Exam Words",
  description:
    "Build and track your CELPIP vocabulary with flashcard study mode. Add words, mark them mastered, and get AI-powered recommendations to expand your exam-ready word list.",
  alternates: {
    canonical: `${BASE_URL}/words`,
  },
  openGraph: {
    title: "CELPIP Vocabulary Tracker | Learn & Master Exam Words",
    description:
      "Build and track your CELPIP vocabulary with flashcard study mode. Add words, mark them mastered, and get AI-powered recommendations to expand your exam-ready word list.",
    url: `${BASE_URL}/words`,
    siteName: "CELPIP Practice Test",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CELPIP Vocabulary Tracker | Learn & Master Exam Words",
    description:
      "Build and track your CELPIP vocabulary with flashcard study mode. Add words, mark them mastered, and get AI-powered recommendations to expand your exam-ready word list.",
  },
};

export default function WordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
