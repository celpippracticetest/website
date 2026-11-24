"use client";

/** Black Friday 2026 — TEMPORARY (revert Mon 2026-11-30). */

import { useEffect, useState } from "react";
import { blackFridayCountdown, type CountdownParts } from "@/lib/blackFriday";

/** null until mounted, so server and client HTML match. */
export function useBlackFridayCountdown(): CountdownParts | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now == null ? null : blackFridayCountdown(now);
}
