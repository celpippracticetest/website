"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { contentGroupFromPath } from "@/lib/contentGroup";
import { trackEvent } from "@/lib/analytics";

const DEPTHS = [25, 50, 75, 90] as const;

/**
 * KPI `scroll_depth` — fires once per threshold per page (25/50/75/90%).
 */
export default function ScrollDepthTracker() {
  const pathname = usePathname();
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    firedRef.current = new Set();

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const height = doc.scrollHeight - window.innerHeight;
      if (height <= 0) return;

      const percent = Math.min(100, Math.round((scrollTop / height) * 100));
      const contentGroup = contentGroupFromPath(pathname);
      const pageLocation =
        typeof window !== "undefined" ? window.location.href : pathname;

      for (const threshold of DEPTHS) {
        if (percent < threshold || firedRef.current.has(threshold)) continue;
        firedRef.current.add(threshold);
        trackEvent({
          event: "scroll_depth",
          percent_scrolled: threshold,
          content_group: contentGroup,
          page_location: pageLocation,
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
