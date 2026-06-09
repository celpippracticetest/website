"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackBlogListView } from "@/lib/analytics";

/** Track blog list views in GA4. */
export default function BlogListAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/blog") return;
    trackBlogListView(pathname, typeof document !== "undefined" ? document.title : undefined);
  }, [pathname]);

  return null;
}
