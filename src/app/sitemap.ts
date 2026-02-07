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
    "/pricing",
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
