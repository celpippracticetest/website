"use client";

import { useCallback, useEffect, useRef } from "react";
import { trackKpi } from "@/lib/analytics";

type FeedbackContext = "practice" | "exam";

/**
 * Fires `ai_feedback_viewed` once when the panel closes or the page hides,
 * with module, time_on_feedback_sec, and sections_expanded populated.
 */
export function useAiFeedbackViewTracking(options: {
  enabled: boolean;
  context: FeedbackContext;
  module?: string;
  practiceId?: string;
  examId?: string;
  initialSections?: string[];
}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const openedAtRef = useRef<number | null>(null);
  const sectionsRef = useRef<Set<string>>(new Set());
  const firedRef = useRef(false);

  const markSection = useCallback((name: string) => {
    if (!name) return;
    sectionsRef.current.add(name);
  }, []);

  const flush = useCallback(() => {
    if (!openedAtRef.current || firedRef.current) return;
    firedRef.current = true;
    const current = optionsRef.current;
    const elapsedSec = Math.max(
      0,
      Math.round((Date.now() - openedAtRef.current) / 1000),
    );
    trackKpi.aiFeedbackViewed({
      context: current.context,
      practiceId: current.practiceId,
      examId: current.examId,
      module: current.module,
      timeOnFeedbackSec: elapsedSec,
      sectionsExpanded: Math.max(1, sectionsRef.current.size),
    });
  }, []);

  useEffect(() => {
    if (!options.enabled) return;
    firedRef.current = false;
    openedAtRef.current = Date.now();
    sectionsRef.current = new Set(options.initialSections?.filter(Boolean) ?? []);
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      flush();
    };
  }, [
    options.enabled,
    options.context,
    options.module,
    options.practiceId,
    options.examId,
    options.initialSections?.join("|"),
    flush,
  ]);

  return { markSection };
}
