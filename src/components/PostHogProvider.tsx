"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

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
        api_host: POSTHOG_HOST?.trim() || undefined,
        person_profiles: "identified_only",
        capture_pageview: false,
        ...(process.env.NODE_ENV === "development" ? { debug: true } : {}),
      }}
    >
      {children}
    </PHProvider>
  );
}
