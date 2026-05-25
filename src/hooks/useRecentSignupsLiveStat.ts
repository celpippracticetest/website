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
    const id = setInterval(load, LIVE_STATS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  const display = count != null ? count.toLocaleString() : fallbackDisplay;

  return { count, display };
}

/**
 * Polls `/api/analytics/live-stats` for GA4 `sessions` (24h), used as “visits today”.
 */
export function useRecentVisitsLiveStat(
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
        const next = parseRecentVisitsFromLiveStats(data);
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

  const display = count != null ? count.toLocaleString() : fallbackDisplay;

  return { count, display };
}

/**
 * Polls `/api/analytics/live-stats` for the header “online now” figure.
 */
export function useOnlineUsersLiveStat(
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
        const next = parseOnlineUsersFromLiveStats(data);
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

  const display = count != null ? count.toLocaleString() : fallbackDisplay;

  return { count, display };
}
