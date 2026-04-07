"use client";

import { useEffect } from "react";
import { isHomeAbExperimentVariant, type HomeAbVariant } from "@/lib/homeAbTest";

type Props = {
  /** When false (?s=1|2 or ?home=1|2 preview), skip experiment page_view. */
  participatesInExperiment: boolean;
  variant: HomeAbVariant;
};

/**
 * Records one homepage A/B page view per tab session (sessionStorage), when not in preview mode.
 */
export default function HomeAbExperimentTracker({ participatesInExperiment, variant }: Props) {
  useEffect(() => {
    if (!participatesInExperiment) return;
    /* Historical: style 2 vs 3 (passport / legacy); homepage is passport-only now. */
    if (!isHomeAbExperimentVariant(variant)) return;
    if (typeof window === "undefined") return;
    const key = `home_ab_pv_${variant}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/analytics/home-ab-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "page_view", variant }),
    });
  }, [participatesInExperiment, variant]);

  return null;
}
