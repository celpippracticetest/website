"use client";

import { PricingUpgradeModalHeaderList } from "@/components/pages/pricing/PricingUpgradeModalHeaderList";
import { useRecentVisitsLiveStat } from "@/hooks/useRecentSignupsLiveStat";
import { scheduleIdleTask } from "@/lib/scheduleIdle";
import { useEffect, useState } from "react";

/** Defers GA4 live-stats fetch until after first paint (LCP-friendly). */
export default function HeroLiveStatsStrip({
  className,
  itemTextClassName,
  emphasisTextClassName,
}: {
  className?: string;
  itemTextClassName?: string;
  emphasisTextClassName?: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const { count: visitsCount, display: visitsDisplay } = useRecentVisitsLiveStat("", {
    enabled,
  });

  useEffect(() => {
    return scheduleIdleTask(() => setEnabled(true));
  }, []);

  if (!enabled || visitsCount == null) {
    return <div className={className} aria-hidden style={{ minHeight: 24 }} />;
  }

  return (
    <PricingUpgradeModalHeaderList
      visitsDisplay={visitsDisplay}
      className={className}
      itemTextClassName={itemTextClassName}
      emphasisTextClassName={emphasisTextClassName}
    />
  );
}
