"use client";

import { Analytics } from "@vercel/analytics/next";
import type { BeforeSendEvent } from "@vercel/analytics";

function beforeSend(event: BeforeSendEvent) {
  if (!event.url || !/^https?:\/\//i.test(event.url)) {
    return null;
  }
  return event;
}

export default function VercelWebAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
