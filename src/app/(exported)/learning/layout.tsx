import LayoutLearningClient from "@/components/dashboard-new/LayoutLearningClient";
import { userNeedsOnboardingSurvey } from "@/lib/userNeedsOnboardingSurvey";
import { currentUser } from "@clerk/nextjs/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "CELPIP AI Learning Assistant | Real-time Practice Feedback",
  description:
    "Ask CELPIP-style questions and get real-time answers. Practice CELPIP strategies, improve task structure, and get targeted guidance.",
  alternates: {
    canonical: "https://celpippracticetest.com/learning",
  },
};

export default async function LearningLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  try {
    user = await currentUser();
  } catch {
    // ignore
  }

  if (userNeedsOnboardingSurvey(user ?? undefined)) {
    redirect("/onboarding-survey");
  }

  return (
    <LayoutLearningClient>{children}</LayoutLearningClient>
  );
}
