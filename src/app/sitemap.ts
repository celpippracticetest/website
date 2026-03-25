import { MetadataRoute } from "next";
import { getWikiSlugs } from "@/lib/wiki/public";
import { getPublishedBlogSlugs } from "@/lib/blog/public";
import { getPublishedProfessionPageSlugs } from "@/lib/profession-pages/public";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const professionSlugs = await getPublishedProfessionPageSlugs();
  const professionRoutes = professionSlugs.map((slug) => `/${slug}`);

  const routes = [
    "",
    "/listening",
    "/reading",
    "/writing",
    "/speaking",
    "/exam-overview",
    "/wiki",
    "/blog",
    "/practice-overview",
    "/terms-of-service",
    "/privacy-policy",
    "/refund-policy",
    "/pricing",
    "/app",
    ...professionRoutes,
    "/score-calculator",
    "/words",
    "/learning",
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const wikiSlugs = await getWikiSlugs();
  const wikiRoutes = wikiSlugs.map((item) => ({
    url: `${BASE_URL}/wiki/${item.slug}`,
    lastModified: item.updatedAt || new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogSlugs = await getPublishedBlogSlugs();
  const blogRoutes = blogSlugs
    .filter((post) => {
      if (!post.canonicalUrl) return true;
      const selfUrl = `${BASE_URL}/blog/${post.slug}`;
      const normalise = (u: string) => u.replace(/\/$/, "").toLowerCase();
      return normalise(post.canonicalUrl) === normalise(selfUrl);
    })
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

  return [...routes, ...wikiRoutes, ...blogRoutes];
}
