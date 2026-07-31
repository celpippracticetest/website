"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isLeavingMockResults } from "@/lib/nps";
import { useNpsStore } from "@/store/useNps.store";

/**
 * Captures in-app link clicks while mock results leave-guard is armed.
 * Programmatic router.push callers should use `npsAwareNavigate`.
 */
export default function NpsLeaveGuard() {
  const pathname = usePathname();
  const mockLeaveArmed = useNpsStore((s) => s.mockLeaveArmed);
  const tryInterceptNavigation = useNpsStore((s) => s.tryInterceptNavigation);

  useEffect(() => {
    if (!mockLeaveArmed) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      // External / new tab
      if (anchor.target === "_blank") return;

      let resolved = href;
      try {
        if (href.startsWith("http")) {
          const url = new URL(href);
          if (url.origin !== window.location.origin) return;
          resolved = `${url.pathname}${url.search}${url.hash}`;
        }
      } catch {
        return;
      }

      if (!isLeavingMockResults(pathname, resolved)) return;

      if (tryInterceptNavigation(resolved)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mockLeaveArmed, pathname, tryInterceptNavigation]);

  return null;
}

/** Use instead of router.push when leaving pages that may need NPS. */
export function npsAwareNavigate(
  href: string,
  push: (href: string) => void,
  currentPath?: string,
): void {
  const path =
    currentPath ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const { mockLeaveArmed, tryInterceptNavigation } = useNpsStore.getState();

  if (
    mockLeaveArmed &&
    isLeavingMockResults(path, href) &&
    tryInterceptNavigation(href)
  ) {
    return;
  }
  push(href);
}
