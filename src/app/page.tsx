import dynamic from "next/dynamic";
import { getPublishedBlogPosts } from "@/lib/blog/public";
import { getBlogCoverImage } from "@/lib/blog/coverImage";
import type { HomeBlogPost } from "@/components/pages/landing/Blog";

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  {
    ssr: true,
  },
);

// Same cadence as /blog so new articles reach the homepage within the hour.
export const revalidate = 3600;

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

  return <HomePageClient blogPosts={blogPosts} />;
}
