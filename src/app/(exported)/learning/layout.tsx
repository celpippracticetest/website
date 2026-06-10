import LayoutLearningClient from "@/components/dashboard-new/LayoutLearningClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily CELPIP Learning | CLB-Focused Lessons",
  description:
    "Personalized daily CELPIP lessons for Listening, Reading, Writing, and Speaking. Set your CLB goals, study rubric comparisons, vocabulary, and drills — one skill module per day.",
  alternates: {
    canonical: "https://celpippracticetest.com/learning",
  },
};

export default async function LearningLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LayoutLearningClient>{children}</LayoutLearningClient>
  );
}
