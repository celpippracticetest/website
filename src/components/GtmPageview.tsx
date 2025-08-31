"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    dataLayer: Record<string, any>[];
    __gtmInjected?: boolean;
  }
}

export default function GtmPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    window.dataLayer = window.dataLayer || [];

    if (isFirst.current) {
      isFirst.current = false;
      window.dataLayer.push({
        event: "pageview",
        page_path: url,
        page_location:
          typeof window !== "undefined" ? window.location.href : "",
        page_title: document?.title ?? "",
      });
      return;
    }

    window.dataLayer.push({
      event: "pageview",
      page_path: url,
      page_location: typeof window !== "undefined" ? window.location.href : "",
      page_title: document?.title ?? "",
    });
  }, [pathname, searchParams]);

  return null;
}
