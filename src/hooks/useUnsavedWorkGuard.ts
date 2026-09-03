"use client";

import { useEffect } from "react";

/** Warn on refresh / tab close while an attempt is in progress. */
export function useUnsavedWorkGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);
}
