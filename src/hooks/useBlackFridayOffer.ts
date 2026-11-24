"use client";

/**
 * Black Friday 2026 — TEMPORARY (revert Mon 2026-11-30).
 * `eligible` is false until the server answers, so ineligible visitors never
 * see a flash of the sale.
 */

import { useEffect, useState } from "react";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { BLACK_FRIDAY_ENDS_AT_MS, isBlackFridayActive } from "@/lib/blackFriday";

const cache = new Map<string, Promise<boolean>>();

function fetchEligibility(key: string): Promise<boolean> {
  let pending = cache.get(key);
  if (!pending) {
    pending = fetch("/api/black-friday", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : { eligible: false }))
      .then((data: { eligible?: boolean }) => Boolean(data.eligible))
      .catch(() => false);
    cache.set(key, pending);
  }
  return pending;
}

export function useBlackFridayOffer(): { eligible: boolean } {
  const { user, isLoaded } = useHybridWebUser();
  const userKey = isLoaded ? user?.id ?? "guest" : null;
  const [result, setResult] = useState<{ key: string; eligible: boolean } | null>(
    null,
  );
  const [ended, setEnded] = useState(() => !isBlackFridayActive());

  useEffect(() => {
    if (!userKey || ended) return;
    let cancelled = false;
    void fetchEligibility(userKey).then((eligible) => {
      if (!cancelled) setResult({ key: userKey, eligible });
    });
    return () => {
      cancelled = true;
    };
  }, [userKey, ended]);

  // Turn the sale off in an open tab when it ends.
  useEffect(() => {
    if (ended) return;
    const ms = BLACK_FRIDAY_ENDS_AT_MS - Date.now();
    if (ms > 2_147_483_647) return;
    const t = window.setTimeout(() => setEnded(true), Math.max(0, ms) + 1000);
    return () => window.clearTimeout(t);
  }, [ended]);

  return {
    eligible: !ended && result != null && result.key === userKey && result.eligible,
  };
}
