import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { getPublishedBlogPosts } from "@/lib/blog/public";
import { getBlogCoverImage } from "@/lib/blog/coverImage";
import { buildWebSiteJsonLd } from "@/lib/seo/siteSchema";
import { buildHomepageFaqJsonLd } from "@/data/homepage-faqs";
import { JsonLd } from "@/components/seo/JsonLd";
import type { HomeBlogPost } from "@/components/pages/landing/Blog";

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  {
    ssr: true,
  },
);

// Same cadence as /blog so new articles reach the homepage within the hour.
export const revalidate = 3600;

const HOME_TITLE = "CELPIP Practice Test Online | Instant Scoring, Expert Tips";
const HOME_DESCRIPTION =
  "Free CELPIP practice tests and mock exams with instant AI scoring for Writing and Speaking. Practise all 4 skills and track your CLB level.";
const HOME_OG_IMAGE = {
  url: "/og-home.png",
  width: 1200,
  height: 630,
  alt: "CELPIP Practice Test: free practice tests with instant AI scoring",
};

// Head tags from the design handoff (data/head-tags.html). metadataBase in the
// root layout turns these relative URLs into absolute ones.
export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [HOME_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [HOME_OG_IMAGE.url],
  },
};

function formatDate(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function estimateReadTime(contentHtml?: string): string {
  if (!contentHtml) return "3 min read";
  const words = contentHtml.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export default async function HomePage() {
  const baseUrl = (process.env.APP_BASE_URL || "https://celpippracticetest.com").replace(/\/$/, "");
  const { items } = await getPublishedBlogPosts(0, 4);
  const blogPosts: HomeBlogPost[] = items.slice(0, 4).map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    category: post.categories[0] ?? null,
    readTime: estimateReadTime(post.contentHtml),
    date: formatDate(post.publishedAt ?? post.createdAt),
    cover: getBlogCoverImage(post),
  }));

  // Organization comes from the root layout; the homepage adds WebSite + FAQPage
  // (the FAQ entries come from the same data the accordion renders).
  const { "@context": _websiteContext, ...website } = buildWebSiteJsonLd(baseUrl);
  const { "@context": _faqContext, ...faqPage } = buildHomepageFaqJsonLd(baseUrl);
  const homepageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [website, faqPage],
  };

  return (
    <>
      <JsonLd data={homepageJsonLd} />
      <HomePageClient blogPosts={blogPosts} />
    </>
  );
}
