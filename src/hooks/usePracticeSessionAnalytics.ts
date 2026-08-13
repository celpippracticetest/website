"use client";

import { useEffect, useRef } from "react";
import { trackKpi, type PracticeModule } from "@/lib/analytics";

type UsePracticeSessionAnalyticsArgs = {
  testId: string;
  module: PracticeModule;
  testType?: "full_mock" | "module" | "quiz";
  /** 0–100 estimated completion when leaving */
  getPercentComplete?: () => number;
  getLastQuestionIndex?: () => number;
  /** When true, skip abandon (e.g. after successful submit) */
  completedRef?: React.MutableRefObject<boolean>;
};

/**
 * Fires practice_test_abandon on unmount / pagehide unless the attempt completed.
 */
export function usePracticeSessionAnalytics({
  testId,
  module,
  getPercentComplete,
  getLastQuestionIndex,
  completedRef,
}: UsePracticeSessionAnalyticsArgs): void {
  const startedRef = useRef(false);
  const testIdRef = useRef(testId);
  const moduleRef = useRef(module);
  const getPercentRef = useRef(getPercentComplete);
  const getLastQRef = useRef(getLastQuestionIndex);

  testIdRef.current = testId;
  moduleRef.current = module;
  getPercentRef.current = getPercentComplete;
  getLastQRef.current = getLastQuestionIndex;

  useEffect(() => {
    if (!testId || startedRef.current) return;
    startedRef.current = true;

    const fireAbandon = (exitReason: string) => {
      if (completedRef?.current) return;
      trackKpi.practiceTestAbandon({
        testId: testIdRef.current,
        module: moduleRef.current,
        percentComplete: getPercentRef.current?.() ?? undefined,
        lastQuestionIndex: getLastQRef.current?.() ?? undefined,
        exitReason,
      });
    };

    const onPageHide = () => fireAbandon("pagehide");
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      fireAbandon("navigation_away");
    };
  }, [testId, completedRef]);
}
