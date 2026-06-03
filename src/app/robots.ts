import { MetadataRoute } from "next";
import { isNonIndexableDeployment } from "@/lib/searchIndexing";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export default function robots(): MetadataRoute.Robots {
  if (isNonIndexableDeployment(BASE_URL)) {
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
