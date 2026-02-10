"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackBlogArticleView } from "@/lib/gtm";

interface BlogArticleGtmProps {
  articleTitle: string;
  articleSlug: string;
  categories?: string[];
}

/**
 * Pushes blog_article_viewed to GTM dataLayer when the user views a blog post.
 */
export default function BlogArticleGtm({
  articleTitle,
  articleSlug,
  categories = [],
}: BlogArticleGtmProps) {
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
