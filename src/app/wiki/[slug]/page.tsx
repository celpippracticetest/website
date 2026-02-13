import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getWikiArticleBySlug,
  getNextWikiArticle,
  getRelatedWikiArticles,
  getAllWikiArticles,
} from "@/lib/wiki/public";
import { linkContentServer } from "@/lib/content-linker-server";
import WikiArticleClient from "@/components/wiki/WikiArticleClient";

interface PageProps {
  params: Promise<{ slug: string }>;
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

  const description =
    currentArticle.description ||
    `Learn about ${currentArticle.title} in our comprehensive CELPIP guide.`;

  return {
    title: `${currentArticle.title} | CELPIP Wiki`,
    description,
    alternates: {
      canonical: `/wiki/${slug}`,
    },
  };
}

export default async function WikiPage({ params }: PageProps) {
  const { slug } = await params;
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

  return (
    <WikiArticleClient
      currentArticle={currentArticle}
      slug={slug}
      linkedContent={linkedContent}
      allArticles={allArticles}
      nextArticle={nextArticle}
      relatedArticles={relatedArticles}
    />
  );
}
