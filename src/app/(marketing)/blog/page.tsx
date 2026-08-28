import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublishedBlogPosts } from "@/lib/blog/public";
import BlogListAnalytics from "@/components/analytics/BlogListAnalytics";
import BlogIndexContent from "@/components/pages/blog/BlogIndexContent";
import { publicSiteOrigin } from "@/lib/seo/publicSite";

/** Keep in sync with `PUBLIC_PAGE_REVALIDATE_SECONDS` in `@/lib/publicPageCache`. */
export const revalidate = 3600;

const BASE_URL = publicSiteOrigin();
const BLOG_URL = `${BASE_URL}/blog`;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "CELPIP Blog | Tips, Strategies, and Score Guides",
    description:
      "Read CELPIP preparation guides, section strategies, and score improvement tips for Listening, Reading, Writing, and Speaking.",
    keywords: [
      "CELPIP blog",
      "CELPIP tips",
      "CELPIP strategies",
      "CELPIP writing guide",
      "CELPIP speaking guide",
      "CELPIP reading tips",
    ],
    alternates: {
      canonical: BLOG_URL,
    },
    openGraph: {
      title: "CELPIP Blog | Tips, Strategies, and Score Guides",
      description:
        "Expert CELPIP resources covering exam strategy, scoring insights, and practical study plans.",
      type: "website",
      url: BLOG_URL,
      images: [
        {
          url: "/images/hero.png",
          width: 1200,
          height: 630,
          alt: "CELPIP Blog",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "CELPIP Blog | Tips, Strategies, and Score Guides",
      description:
        "Expert CELPIP resources covering exam strategy, scoring insights, and practical study plans.",
      images: ["/images/hero.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function BlogListingPage() {
  const { items } = await getPublishedBlogPosts(0, 100);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "CELPIP Blog Articles",
    itemListElement: items.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: post.title,
      url: `${BASE_URL}/blog/${post.slug}`,
    })),
  };

  return (
    <>
      <BlogListAnalytics />
      {items.length > 0 ? <JsonLd data={itemListSchema} /> : null}
      <BlogIndexContent items={items} />
    </>
  );
}
