import { MetadataRoute } from "next";
import { getWikiSlugs } from "@/lib/wiki/public";
import { getPublishedBlogSlugs } from "@/lib/blog/public";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    "/celpip-for-nurses",
    "/celpip-for-immigration-consultant",
    "/celpip-for-real-estate",
    "/celpip-for-professional-licensure",
    "/celpip-for-physicians-surgeons",
    "/celpip-for-early-childhood-educator",
    "/celpip-for-mortgage-broker",
    "/celpip-for-pharmacist",
    "/celpip-for-medical-laboratory-technologist",
    "/celpip-for-teacher-certification",
    "/celpip-for-health-care-aide",
    "/celpip-for-physiotherapist",
    "/celpip-for-commercial-truck-driver",
    "/celpip-for-caregiver-home-support",
    "/celpip-for-skilled-trades",
    "/celpip-for-dentist-dental-hygienist",
    "/celpip-for-startup-visa-entrepreneur",
    "/celpip-for-social-worker",
    "/celpip-for-midwife",
    "/celpip-for-tech-worker",
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
