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

/** Per-slug SEO overrides (title/description/H1) for high-value wiki URLs. */
const WIKI_SEO_BY_SLUG: Record<
  string,
  { title?: string; description?: string; pageHeading?: string }
> = {
  "celpip-speaking-tips-high-score": {
    description:
      "Get high-score CELPIP speaking tips with clear response frameworks, timing strategies, vocabulary ideas, and key mistakes to avoid for confident answers.",
  },
  "celpip-exam-overview": {
    title: "CELPIP Exam: General Test, LS & Format Guide",
    description:
      "CELPIP exam explained: CELPIP-General vs CELPIP-General LS, IRCC uses, sections, timing, scoring to CLB, and how to prepare. Official-style overview for test takers.",
    pageHeading: "CELPIP Exam: General Test, LS Format & Scoring Overview",
  },
  "celpip-reading-score-guide": {
    title: "CELPIP Reading Score Chart, Levels & IELTS Conversion",
    description:
      "CELPIP Reading scores decoded: level chart, raw-to-level conversion, CLB ties, and CELPIP to IELTS score comparison—plus practical ways to raise your reading result.",
    pageHeading: "CELPIP Reading Score Chart, Levels & IELTS Conversion",
  },
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
  const seo = WIKI_SEO_BY_SLUG[slug];
  const description =
    seo?.description ||
    currentArticle.description ||
    `Learn about ${currentArticle.title} in our comprehensive CELPIP guide.`;

  return {
    title: buildWikiTitle(seo?.title ?? currentArticle.title),
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
      pageHeading={WIKI_SEO_BY_SLUG[slug]?.pageHeading}
      linkedContent={linkedContentHtml}
      filteredArticles={filteredArticles}
      nextArticle={nextArticle}
      relatedArticles={relatedArticles}
      sidebarSearchQuery={sidebarSearchQuery}
    />
  );
}
