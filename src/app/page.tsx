import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { getPublishedBlogPostBySlug } from "@/lib/blog/public";
import { HOMEPAGE_FEATURED_POSTS } from "@/data/homepage-blog";
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

// Same cadence as /blog so CMS cover/date changes reach the homepage within the hour.
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function HomePage() {
  const baseUrl = (process.env.APP_BASE_URL || "https://celpippracticetest.com").replace(/\/$/, "");
  // The featured articles from the design: card copy from src/data/homepage-blog,
  // cover and publish date live from the CMS. Missing/unpublished posts are skipped.
  const featured = await Promise.all(
    HOMEPAGE_FEATURED_POSTS.map(async (item) => ({ item, post: await getPublishedBlogPostBySlug(item.slug) })),
  );
  const blogPosts: HomeBlogPost[] = featured.flatMap(({ item, post }) =>
    post
      ? [
          {
            id: post.id,
            slug: item.slug,
            title: item.title,
            category: item.category,
            readTime: item.readTime,
            date: formatDate(post.publishedAt ?? post.createdAt) ?? item.fallbackDate,
            cover: getBlogCoverImage(post),
          },
        ]
      : [],
  );

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
