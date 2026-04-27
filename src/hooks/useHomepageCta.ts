"use client";

import { useCallback } from "react";
import { useEventTracker } from "@/hooks/useTracking";

type HomepageCtaConfig = {
  href: string;
  label: string;
  shortLabel: string;
  trackingLabel: string;
  variantKey: string;
};

const DEFAULT_CTA: HomepageCtaConfig = {
  href: "/practice-overview",
  label: "Continue to free practice",
  shortLabel: "Free practice",
  trackingLabel: "Continue to free practice",
  variantKey: "control",
};

export function useHomepageCta() {
  const { trackCTA } = useEventTracker();

  const trackClick = useCallback(
    (location: string) => {
      trackCTA(DEFAULT_CTA.trackingLabel, location);
    },
    [trackCTA],
  );

  return {
    ...DEFAULT_CTA,
    trackClick,
  };
}
