"use client";

import { useEffect } from "react";
import { trackKpi } from "@/lib/analytics";

/** Only surface console noise for tasks that can affect INP; milder ones stay silent. */
const LONG_TASK_WARN_MS = 200;

export default function PerformanceMonitor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    (async () => {
      try {
        const { onCLS, onINP, onFCP, onLCP, onTTFB } =
          await import("web-vitals");
        const send = (metric: { name: string; value: number }) => {
          if (
            metric.name === "LCP" ||
            metric.name === "INP" ||
            metric.name === "CLS" ||
            metric.name === "FCP" ||
            metric.name === "TTFB"
          ) {
            trackKpi.webVitals({
              metricName: metric.name,
              value: metric.value,
            });
          }
        };
        onCLS(send);
        onINP(send);
        onFCP(send);
        onLCP(send);
        onTTFB(send);
      } catch (e) {
        console.error("web-vitals load failed:", e);
      }
    })();

    let longTaskObserver: PerformanceObserver | null = null;
    if (
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes?.includes("longtask")
    ) {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration;
          if (duration > LONG_TASK_WARN_MS) {
            console.warn(`Long task detected: ${duration.toFixed(1)}ms`, entry);
          }
        }
      });
      try {
        longTaskObserver.observe({ entryTypes: ["longtask"] });
      } catch {
        // Long Tasks API not available in this browser.
      }
    }

    return () => {
      longTaskObserver?.disconnect();
    };
  }, []);

  return null;
}
