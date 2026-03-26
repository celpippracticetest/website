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

const WIKI_META_DESCRIPTION_OVERRIDES: Record<string, string> = {
  "celpip-speaking-tips-high-score":
    "Get high-score CELPIP speaking tips with clear response frameworks, timing strategies, vocabulary ideas, and key mistakes to avoid for confident answers.",
};

const WIKI_TITLE_SUFFIX = " | CELPIP Wiki";

function buildWikiTitle(title: string): string {
  const trimmed = title.trim();
  const withSuffix = `${trimmed}${WIKI_TITLE_SUFFIX}`;

  if (withSuffix.length <= 55) {
    return withSuffix;
  }

  if (trimmed.length <= 55) {
    return trimmed;
  }

  return `${trimmed.slice(0, 52).trim()}...`;
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

  const baseUrl = new URL(
    process.env.APP_BASE_URL || "https://celpippracticetest.com"
  ).toString();
  const description =
    WIKI_META_DESCRIPTION_OVERRIDES[slug] ||
    currentArticle.description ||
    `Learn about ${currentArticle.title} in our comprehensive CELPIP guide.`;

  return {
    title: buildWikiTitle(currentArticle.title),
    description,
    alternates: {
      canonical: new URL(`/wiki/${slug}`, baseUrl).toString(),
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

  let linkedContentHtml = await linkContentServer(currentArticle.content, `/wiki/${slug}`);
  linkedContentHtml = linkedContentHtml.replace(/<h1/g, "<h2").replace(/<\/h1>/g, "</h2>");

  const [nextArticle, relatedArticles, allArticles] =
    await Promise.all([
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
      linkedContent={linkedContentHtml}
      filteredArticles={filteredArticles}
      nextArticle={nextArticle}
      relatedArticles={relatedArticles}
      sidebarSearchQuery={sidebarSearchQuery}
    />
  );
}
