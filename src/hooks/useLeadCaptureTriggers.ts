"use client";

import { useEffect, useRef } from "react";

export type LeadCaptureTriggerConfig = {
  exitIntent: { enabled: boolean; value: number };
  timeOnPage: { enabled: boolean; value: number };
  scrollDepth: { enabled: boolean; value: number };
};

type UseLeadCaptureTriggersArgs = {
  config: LeadCaptureTriggerConfig;
  enabled: boolean;
  onTrigger: (source: "exit_intent" | "time_on_page" | "scroll_depth") => void;
};

export function useLeadCaptureTriggers({
  config,
  enabled,
  onTrigger,
}: UseLeadCaptureTriggersArgs) {
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const cleanupFns: Array<() => void> = [];
    const fireOnce = (source: "exit_intent" | "time_on_page" | "scroll_depth") => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      onTrigger(source);
    };

    if (config.timeOnPage.enabled) {
      const delayMs = Math.max(0, config.timeOnPage.value) * 1000;
      const timeoutId = window.setTimeout(() => {
        fireOnce("time_on_page");
      }, delayMs);
      cleanupFns.push(() => window.clearTimeout(timeoutId));
    }

    if (config.scrollDepth.enabled) {
      const onScroll = () => {
        const viewportHeight = window.innerHeight;
        const doc = document.documentElement;
        const totalScrollable = doc.scrollHeight - viewportHeight;
        if (totalScrollable <= 0) return;

        const currentProgress = (window.scrollY / totalScrollable) * 100;
        if (currentProgress >= Math.max(0, config.scrollDepth.value)) {
          fireOnce("scroll_depth");
        }
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      cleanupFns.push(() => window.removeEventListener("scroll", onScroll));
    }

    if (config.exitIntent.enabled) {
      const onMouseLeave = (event: MouseEvent) => {
        if (event.clientY <= 0) {
          fireOnce("exit_intent");
        }
      };

      document.addEventListener("mouseleave", onMouseLeave);
      cleanupFns.push(() =>
        document.removeEventListener("mouseleave", onMouseLeave)
      );
    }

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [
    config.exitIntent.enabled,
    config.scrollDepth.enabled,
    config.scrollDepth.value,
    config.timeOnPage.enabled,
    config.timeOnPage.value,
    enabled,
    onTrigger,
  ]);
}
