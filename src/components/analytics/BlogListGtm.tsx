"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackBlogListView } from "@/lib/gtm";

/**
 * Pushes blog_list_viewed to GTM dataLayer when the user is on the blog listing page.
 */
export default function BlogListGtm() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/blog") return;
    trackBlogListView(pathname, typeof document !== "undefined" ? document.title : undefined);
  }, [pathname]);

  return null;
}
