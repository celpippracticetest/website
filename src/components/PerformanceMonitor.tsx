"use client";

import { useEffect } from "react";
import { trackKpi } from "@/lib/analytics";

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
            metric.name === "CLS"
          ) {
            trackKpi.webVitals({
              metricName: metric.name,
              value: metric.value,
            });
          }
        };
        onCLS(send);
        onINP(send);
        onFCP(console.log);
        onLCP(send);
        onTTFB(console.log);
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
                `Slow JS execution: ${entry.name} took ${duration.toFixed(1)}ms`,
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
          if (d > 50) {
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
