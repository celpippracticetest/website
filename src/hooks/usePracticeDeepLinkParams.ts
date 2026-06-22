"use client";

import { parsePracticeDeepLink } from "@/lib/practiceRoutes";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function usePracticeDeepLinkParams() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(
    () => parsePracticeDeepLink(pathname, searchParams),
    [pathname, searchParams],
  );
}
