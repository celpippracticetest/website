import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getWikiArticleBySlug,
  getNextWikiArticle,
  getRelatedWikiArticles,
  getAllWikiArticles,
} from "@/lib/wiki/public";
import { linkContentServer } from "@/lib/content-linker-server";
import WikiArticleContent from "@/components/wiki/WikiArticleContent";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const currentArticle = await getWikiArticleBySlug(slug);

  if (!currentArticle) {
    return {
      title: "Article Not Found | CELPIP Wiki",
      description: "The requested article could not be found.",
    };
  }

  const baseUrl = process.env.APP_BASE_URL || "https://celpippracticetest.com";
  const description =
    currentArticle.description ||
    `Learn about ${currentArticle.title} in our comprehensive CELPIP guide.`;

  return {
    title: `${currentArticle.title} | CELPIP Wiki`,
    description,
    alternates: {
      canonical: `${baseUrl}/wiki/${slug}`,
    },
  };
}

export default async function WikiPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { q } = await searchParams;
  const sidebarSearchQuery = (q ?? "").trim();

  const currentArticle = await getWikiArticleBySlug(slug);

  if (!currentArticle) {
    return notFound();
  }

  const [linkedContent, nextArticle, relatedArticles, allArticles] =
    await Promise.all([
      linkContentServer(currentArticle.content),
      getNextWikiArticle(slug),
      getRelatedWikiArticles(currentArticle.id, currentArticle.category, 2),
      getAllWikiArticles(),
    ]);

  const filteredArticles = sidebarSearchQuery
    ? allArticles.filter((article) =>
        article.title.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
      )
    : allArticles;

  return (
    <WikiArticleContent
      currentArticle={currentArticle}
      slug={slug}
      linkedContent={linkedContent}
      filteredArticles={filteredArticles}
      nextArticle={nextArticle}
      relatedArticles={relatedArticles}
      sidebarSearchQuery={sidebarSearchQuery}
    />
  );
}
