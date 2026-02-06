import { MetadataRoute } from "next";
import { wikiArticles } from "@/data/wiki";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/listening",
    "/reading",
    "/writing",
    "/speaking",
    "/exam-overview",
    "/wiki",
    "/practice-overview",
    "/terms-of-service",
    "/privacy-policy",
    "/refund-policy",
    "/words",
    "/learning",
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const wikiRoutes = wikiArticles.map((article) => ({
    url: `${BASE_URL}/wiki/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...routes, ...wikiRoutes];
}
