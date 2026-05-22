"use client";

import { useEffect } from "react";

export default function PerformanceMonitor() {
  useEffect(() => {
    // Opt-in only — avoids flooding user consoles on production (web-vitals, long tasks).
    if (process.env.NEXT_PUBLIC_PERF_DEBUG !== "true") return;
    const botUserAgentRegex =
      /bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex/i;
    const isBotClient =
      typeof navigator !== "undefined" &&
      botUserAgentRegex.test(navigator.userAgent || "");
    if (isBotClient) return;

    (async () => {
      try {
        const vitals = await import("web-vitals");
        const report = (metric: unknown) => console.log(metric);

        // web-vitals v4 uses onINP (FID removed). Keep a fallback for older versions.
        if (typeof vitals.onCLS === "function") vitals.onCLS(report);
        if (typeof vitals.onFCP === "function") vitals.onFCP(report);
        if (typeof vitals.onLCP === "function") vitals.onLCP(report);
        if (typeof vitals.onTTFB === "function") vitals.onTTFB(report);

        const maybeVitals = vitals as unknown as {
          onINP?: (cb: (metric: unknown) => void) => void;
          getFID?: (cb: (metric: unknown) => void) => void;
        };
        if (typeof maybeVitals.onINP === "function") {
          maybeVitals.onINP(report);
        } else if (typeof maybeVitals.getFID === "function") {
          maybeVitals.getFID(report);
        }
      } catch (e) {
        console.error("web-vitals load failed:", e);
      }
    })();

    let measureObserver: PerformanceObserver | null = null;
    if (
      typeof PerformanceObserver !== "undefined" &&
      (!("supportedEntryTypes" in PerformanceObserver) ||
        PerformanceObserver.supportedEntryTypes?.includes("measure"))
    ) {
      measureObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "measure") {
            const duration = entry.duration;
            if (duration > 100) {
              console.warn(
                `Slow JS execution: ${entry.name} took ${duration.toFixed(1)}ms`
              );
            }
          }
        }
      });
      try {
        measureObserver.observe({ entryTypes: ["measure"] });
      } catch {}
    }

    // Long tasks (Long Tasks API)
    let longTaskObserver: PerformanceObserver | null = null;
    if (
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes?.includes("longtask")
    ) {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const d = entry.duration as number;
          // Long Task API threshold is 50ms; only surface clearly blocking work.
          if (d > 250) {
            console.warn(`Long task detected: ${d.toFixed(1)}ms`, entry);
          }
        }
      });
      try {
        longTaskObserver.observe({ entryTypes: ["longtask"] });
      } catch {}
    }

    return () => {
      measureObserver?.disconnect();
      longTaskObserver?.disconnect();
    };
  }, []);

  return null;
}
