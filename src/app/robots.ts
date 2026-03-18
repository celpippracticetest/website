import { MetadataRoute } from "next";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/cms/", "/auth/", "/referral/", "/*?taskId="],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
