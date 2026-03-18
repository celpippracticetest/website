import { Metadata } from "next";
import { getAllWikiArticles } from "@/lib/wiki/public";
import WikiIndexContent from "@/components/wiki/WikiIndexContent";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export const metadata: Metadata = {
  title: "CELPIP Wiki: Your Comprehensive Study Guide | CELPIP Practice Test",
  description:
    "Browse expert CELPIP guides, tips, and strategies for Reading, Writing, Listening, and Speaking. Your comprehensive CELPIP study resource.",
  alternates: {
    canonical: `${BASE_URL}/wiki`,
  },
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function WikiIndexPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const searchQuery = (q ?? "").trim();
  const allArticles = await getAllWikiArticles();

  const filteredArticles = searchQuery
    ? allArticles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (article.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : allArticles;

  return (
    <WikiIndexContent articles={filteredArticles} searchQuery={searchQuery} />
  );
}
