"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

const HAS_POSTHOG_KEY = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!HAS_POSTHOG_KEY || !pathname || !posthog) return;
    let url = window.location.origin + pathname;
    const search = searchParams.toString();
    if (search) url += `?${search}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, posthog]);

  return null;
}
