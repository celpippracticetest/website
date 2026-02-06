import { Metadata } from 'next';
import { wikiArticles } from '@/data/wiki';
import WikiArticleClient from '@/components/wiki/WikiArticleClient';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const currentArticle = wikiArticles.find(article => article.slug === slug);

  if (!currentArticle) {
    return {
      title: 'Article Not Found | CELPIP Wiki',
      description: 'The requested article could not be found.',
    };
  }

  return {
    title: `${currentArticle.title} | CELPIP Wiki`,
    description: currentArticle.description || `Learn about ${currentArticle.title} in our comprehensive CELPIP guide.`,
    alternates: {
      canonical: `/wiki/${slug}`,
    }
  };
}

export default async function WikiPage({ params }: PageProps) {
  const { slug } = await params;
  const currentArticle = wikiArticles.find(article => article.slug === slug);

  if (!currentArticle) {
    return notFound();
  }

  return <WikiArticleClient currentArticle={currentArticle} slug={slug} />;
}
