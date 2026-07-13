"use client";

import { useEffect } from "react";

export default function PerformanceMonitor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    (async () => {
      try {
        const { onCLS, onINP, onFCP, onLCP, onTTFB } =
          await import("web-vitals");
        onCLS(console.log);
        onINP(console.log);
        onFCP(console.log);
        onLCP(console.log);
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
