"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";

/**
 * Vercel's `/_vercel/insights/view` validates `o` as a strict URI and returns 400
 * for otherwise-valid page URLs that contain raw `{`, `}`, etc. in the query string.
 * Rebuild the URL so the query is form-urlencoded.
 */
function sanitizeAnalyticsUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const search = url.searchParams.toString();
    return `${url.origin}${url.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return null;
  }
}

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = sanitizeAnalyticsUrl(event.url);
  if (!url) return null;
  if (url === event.url) return event;
  return { ...event, url };
}

export default function VercelAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
