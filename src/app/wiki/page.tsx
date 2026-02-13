import { Metadata } from "next";
import { getAllWikiArticles } from "@/lib/wiki/public";
import WikiIndexClient from "@/components/wiki/WikiIndexClient";

export const metadata: Metadata = {
  title: "CELPIP Wiki: Your Comprehensive Study Guide | CELPIP Practice Test",
  description:
    "Browse expert CELPIP guides, tips, and strategies for Reading, Writing, Listening, and Speaking. Your comprehensive CELPIP study resource.",
  alternates: {
    canonical: "/wiki",
  },
};

export default async function WikiIndexPage() {
  const articles = await getAllWikiArticles();

  return <WikiIndexClient articles={articles} />;
}
