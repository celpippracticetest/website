"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refetch RSC after browser back/forward (avoids stale segment tree / 404 in dev). */
export function PracticeNavigationRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener("popstate", refresh);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  return null;
}
