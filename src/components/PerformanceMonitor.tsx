"use client";

import { useEffect } from "react";

export default function PerformanceMonitor() {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== "production") return;

    // Monitor Core Web Vitals
    if ("web-vital" in window) {
      import("web-vitals").then(
        ({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
          getCLS(console.log);
          getFID(console.log);
          getFCP(console.log);
          getLCP(console.log);
          getTTFB(console.log);
        }
      );
    }

    // Monitor JavaScript execution time
    let startTime = performance.now();

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "measure") {
          const duration = entry.duration;
          if (duration > 100) {
            // Log if execution takes more than 100ms
            console.warn(
              `Slow JavaScript execution: ${entry.name} took ${duration}ms`
            );
          }
        }
      }
    });

    observer.observe({ entryTypes: ["measure"] });

    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          // Long task threshold
          console.warn(`Long task detected: ${entry.duration}ms`, entry);
        }
      }
    });

    longTaskObserver.observe({ entryTypes: ["longtask"] });

    return () => {
      observer.disconnect();
      longTaskObserver.disconnect();
    };
  }, []);

  return null;
}
