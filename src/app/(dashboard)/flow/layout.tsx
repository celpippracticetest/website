import type { Metadata } from "next";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Personalized CELPIP Microlearning Flow | CELPIP Practice Test",
    description:
      "Follow a personalized CELPIP microlearning flow based on your goal, target score, focus skill, and test date. Start the next best learning or practice action instantly.",
    alternates: {
      canonical: `${BASE_URL}/flow`,
    },
    robots: getIndexingRobotsDirective(BASE_URL),
    openGraph: {
      title: "Personalized CELPIP Microlearning Flow",
      description:
        "Get a focused CELPIP learning sequence and launch directly into the highest-impact next step.",
      url: `${BASE_URL}/flow`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Personalized CELPIP Microlearning Flow",
      description:
        "Start a personalized CELPIP flow tailored to your test timeline and focus skill.",
    },
  };
}

export default function FlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
