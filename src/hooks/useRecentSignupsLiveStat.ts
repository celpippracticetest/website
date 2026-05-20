"use client";

import { useEffect, useState } from "react";

type LiveStatsPayload = {
  success?: boolean;
  stats?: { recentSignups?: number };
};

/** GA4 sometimes returns success with 0 when the 24h report fails — do not flash 0 over a good value. */
export function parseRecentSignupsFromLiveStats(
  data: LiveStatsPayload,
  options?: { allowZero?: boolean }
): number | null {
  if (data.success === false) return null;
  const n = data.stats?.recentSignups;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  if (n === 0 && !options?.allowZero) return null;
  return n;
}

/**
 * Polls `/api/analytics/live-stats` for GA4 `newUsers` (24h), used as “joined today”.
 */
export function useRecentSignupsLiveStat(
  fallbackDisplay: string,
  options?: { enabled?: boolean }
): {
  count: number | null;
  display: string;
} {
  const enabled = options?.enabled ?? true;
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/analytics/live-stats");
        if (!res.ok) return;
        const data = (await res.json()) as LiveStatsPayload;
        const next = parseRecentSignupsFromLiveStats(data);
        if (!cancelled && next != null) {
          setCount(next);
        }
      } catch {
        /* keep fallback */
      }
    };

    void load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  const display = count != null ? count.toLocaleString() : fallbackDisplay;

  return { count, display };
}
