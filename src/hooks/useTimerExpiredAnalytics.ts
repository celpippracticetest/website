"use client";

import { useEffect, useRef } from "react";
import { trackKpi, type PracticeModule } from "@/lib/analytics";

/** Fire `timer_expired` once when practice/exam section timer hits 0. */
export function useTimerExpiredAnalytics(
  time: number,
  module: PracticeModule,
  questionsUnanswered?: number
): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (time !== 0 || firedRef.current) return;
    firedRef.current = true;
    trackKpi.timerExpired({
      module,
      questionsUnanswered,
    });
  }, [time, module, questionsUnanswered]);
}
