import { MetadataRoute } from "next";
import { isNonIndexableDeployment } from "@/lib/searchIndexing";
import { getWikiSlugs } from "@/lib/wiki/public";
import { getPublishedBlogSlugs } from "@/lib/blog/public";
import { getPublishedProfessionPageSlugs } from "@/lib/profession-pages/public";
import { seoResourcePages } from "@/data/seo-resource-pages";

/** Generated on demand — avoids exhausting Supabase pooler during `next build`. */
export const dynamic = "force-dynamic";

/** Practice session URLs `/{skill}/{practiceId}/{taskId}` are noindex—omit from sitemap (hubs only). */
const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";
const NORMALIZED_BASE_URL = new URL(BASE_URL).toString();
const STATIC_ROUTE_LAST_MODIFIED = {
  "/": "2026-06-15T00:00:00.000Z",
  "/blog": "2026-05-07T00:00:00.000Z",
  "/contact-us": "2026-06-01T00:00:00.000Z",
  "/exam-overview": "2026-06-10T00:00:00.000Z",
  "/exams": "2026-06-10T00:00:00.000Z",
  "/listening": "2026-06-10T00:00:00.000Z",
  "/practice-overview": "2026-06-10T00:00:00.000Z",
  "/pricing": "2026-06-15T00:00:00.000Z",
  "/privacy-policy": "2026-06-01T00:00:00.000Z",
  "/reading": "2026-06-10T00:00:00.000Z",
  "/refund-policy": "2026-06-01T00:00:00.000Z",
  "/writing": "2026-06-10T00:00:00.000Z",
  "/speaking": "2026-06-10T00:00:00.000Z",
  "/terms-of-service": "2026-06-01T00:00:00.000Z",
  "/wiki": "2026-05-06T00:00:00.000Z",
  "/words": "2026-06-10T00:00:00.000Z",
} as const;

function toAbsoluteUrl(path: string): string {
  return new URL(path, NORMALIZED_BASE_URL).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isNonIndexableDeployment(BASE_URL)) {
    return [];
  }

  const professionSlugs = await getPublishedProfessionPageSlugs();
  const professionRoutes = professionSlugs.map((slug) => `/${slug}`);

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
    ...Object.values(seoResourcePages).map((page) => `/${page.slug}`),
    ...professionRoutes,
    "/words",
  ].map((route) => {
    const path = route || "/";
    const resourcePage = Object.values(seoResourcePages).find(
      (page) => `/${page.slug}` === path
    );
    return {
      url: toAbsoluteUrl(path),
      lastModified: new Date(
        resourcePage?.lastModified ??
        STATIC_ROUTE_LAST_MODIFIED[path as keyof typeof STATIC_ROUTE_LAST_MODIFIED] ??
          "2026-06-10T00:00:00.000Z"
      ),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.8,
    };
  });

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
      lastModified: post.updatedAt || new Date("2026-05-07T00:00:00.000Z"),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

  return [...routes, ...wikiRoutes, ...blogRoutes];
}
