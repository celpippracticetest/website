import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CELPIP AI Learning Assistant | Real-time Practice Feedback",
  description: "Ask CELPIP-style questions and get real-time answers. Practice CELPIP strategies, improve task structure, and get targeted guidance.",
  alternates: {
    canonical: "https://celpippracticetest.com/learning",
  },
};

export default function LearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}