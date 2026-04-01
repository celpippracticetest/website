import { MetadataRoute } from "next";
import { getWikiSlugs } from "@/lib/wiki/public";
import { getPublishedBlogSlugs } from "@/lib/blog/public";
import {
  getPublishedProfessionPageBySlug,
  getPublishedProfessionPageSlugs,
} from "@/lib/profession-pages/public";

/** Practice session URLs `/{skill}/{practiceId}/{taskId}` are noindex—omit from sitemap (hubs only). */
const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";
const NORMALIZED_BASE_URL = new URL(BASE_URL).toString();

function toAbsoluteUrl(path: string): string {
  return new URL(path, NORMALIZED_BASE_URL).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const professionSlugs = await getPublishedProfessionPageSlugs();
  const publishedProfessionSlugs = (
    await Promise.all(
      professionSlugs.map(async (slug) =>
        (await getPublishedProfessionPageBySlug(slug)) ? slug : null
      )
    )
  ).filter((slug): slug is string => Boolean(slug));
  const professionRoutes = publishedProfessionSlugs.map((slug) => `/${slug}`);

  const routes = [
    "",
    "/blog",
    "/contact-us",
    "/exam-overview",
    "/exams",
    "/listening",
    "/practice-overview",
    "/pricing",
    "/privacy-policy",
    "/reading",
    "/refund-policy",
    "/writing",
    "/speaking",
    "/terms-of-service",
    "/wiki",
    ...professionRoutes,
    "/words",
  ].map((route) => ({
    url: toAbsoluteUrl(route || "/"),
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const wikiSlugs = await getWikiSlugs();
  const wikiRoutes = wikiSlugs.map((item) => ({
    url: toAbsoluteUrl(`/wiki/${item.slug}`),
    lastModified: item.updatedAt || new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogSlugs = await getPublishedBlogSlugs();
  const blogRoutes = blogSlugs
    .filter((post) => {
      if (!post.canonicalUrl) return true;
      const selfUrl = toAbsoluteUrl(`/blog/${post.slug}`);
      const normalise = (u: string) => u.replace(/\/$/, "").toLowerCase();
      return normalise(post.canonicalUrl) === normalise(selfUrl);
    })
    .map((post) => ({
      url: toAbsoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

  return [...routes, ...wikiRoutes, ...blogRoutes];
}
