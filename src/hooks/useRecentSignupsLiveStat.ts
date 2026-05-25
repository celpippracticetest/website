"use client";

import { useEffect, useState } from "react";

/** Client poll interval — keep in sync with server GA4 cache (~90s). */
export const LIVE_STATS_POLL_MS = 120_000;

export type LiveStatsPayload = {
  success?: boolean;
  stats?: {
    recentSignups?: number;
    recentVisits?: number;
    onlineUsers?: number;
  };
};

function parsePositiveLiveStat(
  value: number | undefined,
  options?: { allowZero?: boolean }
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  if (value === 0 && !options?.allowZero) return null;
  return value;
}

/** GA4 sometimes returns success with 0 when a sub-report fails — do not flash 0 over a good value. */
export function parseRecentSignupsFromLiveStats(
  data: LiveStatsPayload,
  options?: { allowZero?: boolean }
): number | null {
  if (data.success === false) return null;
  return parsePositiveLiveStat(data.stats?.recentSignups, options);
}

export function parseRecentVisitsFromLiveStats(
  data: LiveStatsPayload,
  options?: { allowZero?: boolean }
): number | null {
  if (data.success === false) return null;
  return parsePositiveLiveStat(data.stats?.recentVisits, options);
}

export function parseOnlineUsersFromLiveStats(
  data: LiveStatsPayload,
  options?: { allowZero?: boolean }
): number | null {
  if (data.success === false) return null;
  return parsePositiveLiveStat(data.stats?.onlineUsers, options);
}

type HookOptions = {
  enabled?: boolean;
  /** Never display a value below this floor (prevents embarrassingly low or zero counts). */
  floor?: number;
};

function makeHook(
  parser: (data: LiveStatsPayload, opts?: { allowZero?: boolean }) => number | null,
) {
  return function useLiveStat(
    fallbackDisplay: string,
    options?: HookOptions,
  ): { count: number | null; display: string } {
    const enabled = options?.enabled ?? true;
    const floor = options?.floor ?? 0;
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
      if (!enabled) return;
      let cancelled = false;

      const load = async () => {
        try {
          const res = await fetch("/api/analytics/live-stats");
          if (!res.ok) return;
          const data = (await res.json()) as LiveStatsPayload;
          const next = parser(data);
          if (!cancelled && next != null) {
            setCount(next);
          }
        } catch {
          /* keep fallback */
        }
      };

      void load();
      const id = setInterval(load, LIVE_STATS_POLL_MS);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [enabled]);

    const flooredCount = count != null ? Math.max(count, floor) : null;
    const display = flooredCount != null ? flooredCount.toLocaleString() : fallbackDisplay;

    return { count: flooredCount, display };
  };
}

/** Polls `/api/analytics/live-stats` for GA4 `newUsers` (24h), used as “joined today”. */
export const useRecentSignupsLiveStat = makeHook(parseRecentSignupsFromLiveStats);

/** Polls `/api/analytics/live-stats` for GA4 `sessions` (24h), used as “visits today”. */
export const useRecentVisitsLiveStat = makeHook(parseRecentVisitsFromLiveStats);

/** Polls `/api/analytics/live-stats` for the “online now” figure. */
export const useOnlineUsersLiveStat = makeHook(parseOnlineUsersFromLiveStats);
