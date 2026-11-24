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

/**
 * `?bf_preview=1` shows the sale design to anyone (kept for the browser
 * session; `?bf_preview=0` clears it). Display only: checkout still checks
 * the real IP country and purchase history, so it never grants the discount.
 */
function readDesignPreview(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get("bf_preview");
    if (q === "1") sessionStorage.setItem("bf26_preview", "1");
    if (q === "0") sessionStorage.removeItem("bf26_preview");
    return sessionStorage.getItem("bf26_preview") === "1";
  } catch {
    return false;
  }
}

export function useBlackFridayOffer(): { eligible: boolean } {
  const [designPreview, setDesignPreview] = useState(false);
  useEffect(() => setDesignPreview(readDesignPreview()), []);
  const real = useRealBlackFridayOffer();
  return { eligible: real.eligible || (designPreview && isBlackFridayActive()) };
}

function useRealBlackFridayOffer(): { eligible: boolean } {
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
