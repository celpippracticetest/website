import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/searchIndexing";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "CELPIP Wiki | Study Guides & Exam Strategies",
    description:
      "Browse CELPIP study guides covering Listening, Reading, Writing, and Speaking with practical tips and scoring strategies.",
    robots: NOINDEX_ROBOTS,
  };
}

export default function WikiLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
