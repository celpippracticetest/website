"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";

/**
 * Fires GA4 `page_view` + Meta CAPI PageView beacon on client navigations.
 * Shares `event_id` so GTM Meta Pixel can dedupe when configured.
 */
export default function MetaPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useHybridWebUser();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const search = searchParams?.toString() ?? "";
    const path = search ? `${pathname}?${search}` : pathname;
    if (lastKey.current === path) return;
    lastKey.current = path;

    const plan =
      typeof user?.publicMetadata?.plan === "string"
        ? user.publicMetadata.plan
        : undefined;

    trackPageView(
      path,
      typeof document !== "undefined" ? document.title : undefined,
      user?.id,
      plan,
    );
  }, [pathname, searchParams, user?.id, user?.publicMetadata?.plan]);

  return null;
}
