"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackBlogArticleView } from "@/lib/analytics";

interface BlogArticleAnalyticsProps {
  articleTitle: string;
  articleSlug: string;
  categories?: string[];
}

/** Track blog article views in GA4. */
export default function BlogArticleAnalytics({
  articleTitle,
  articleSlug,
  categories = [],
}: BlogArticleAnalyticsProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!articleSlug || !articleTitle) return;
    trackBlogArticleView(articleTitle, articleSlug, {
      pagePath: pathname,
      pageTitle: typeof document !== "undefined" ? document.title : undefined,
      categories: categories.length ? categories : undefined,
    });
  }, [articleTitle, articleSlug, pathname, categories]);

  return null;
}
