import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfessionPageTemplate } from "@/components/pages/marketing/ProfessionPageTemplate";
import {
  getPublishedProfessionPageBySlug,
  professionPageToTemplateConfig,
} from "@/lib/profession-pages/public";

/** Keep in sync with `PUBLIC_PAGE_REVALIDATE_SECONDS` in `@/lib/publicPageCache`. */
export const revalidate = 3600;

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getPublishedProfessionPageBySlug(slug);
  if (!doc) return {};
  const title = doc.metaTitle ?? `${doc.title} | CELPIP Practice Test`;
  const description =
    doc.metaDescription ??
    (doc.intro.length > 160 ? `${doc.intro.slice(0, 157)}...` : doc.intro);
  const keywords =
    doc.keywords.length > 0
      ? doc.keywords
      : [`CELPIP for ${doc.title.replace(/^CELPIP for\s+/i, "")}`, "CELPIP Canada", "language test"];
  return {
    title,
    description,
    keywords,
    openGraph: { title: doc.metaTitle ?? doc.title, description, type: "article" },
    alternates: { canonical: `${BASE_URL}/${slug}` },
  };
}

export default async function MarketingDynamicSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getPublishedProfessionPageBySlug(slug);
  if (!doc) notFound();
  return (
    <ProfessionPageTemplate
      config={professionPageToTemplateConfig(doc)}
      pageUrl={`${BASE_URL}/${slug}`}
    />
  );
}
