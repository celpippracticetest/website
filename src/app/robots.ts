import { MetadataRoute } from "next";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/cms/", "/auth/", "/referral/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
