"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

/** US PostHog Cloud ingest (override with `NEXT_PUBLIC_POSTHOG_HOST` for proxy / non-US). */
const DEFAULT_US_API_HOST = "https://us.i.posthog.com";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Uses `apiKey` + `options` so posthog-js initializes inside the library provider.
 * Passing a `client` prop skips that init path and can race with `PostHogPageView`.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider
      apiKey={POSTHOG_KEY}
      options={{
        api_host: POSTHOG_HOST?.trim() || DEFAULT_US_API_HOST,
        person_profiles: "identified_only",
        capture_pageview: false,
        // Manual `$pageview` in `PostHogPageView`; still record SPA unloads (default skips this when pageview is off).
        capture_pageleave: true,
        ...(isProduction
          ? {
              debug: false,
              secure_cookie: true,
            }
          : {
              debug: true,
            }),
      }}
    >
      {children}
    </PHProvider>
  );
}
