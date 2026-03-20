"use client";

import { useEffect, useState } from "react";

export type MockExamViewMode = "classic" | "official";

export const MOCK_EXAM_VIEW_MODE_STORAGE_KEY = "mock-exam-view-mode";
export const MOCK_EXAM_VIEW_MODE_EVENT = "mock-exam-view-mode-changed";

export const useExamViewMode = () => {
  const [viewMode, setViewModeState] = useState<MockExamViewMode>("classic");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedMode = window.localStorage.getItem(MOCK_EXAM_VIEW_MODE_STORAGE_KEY);

    if (storedMode === "official" || storedMode === "classic") {
      setViewModeState(storedMode);
    }
  }, []);

  const setViewMode = (nextMode: MockExamViewMode) => {
    setViewModeState(nextMode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOCK_EXAM_VIEW_MODE_STORAGE_KEY, nextMode);
      window.dispatchEvent(new CustomEvent(MOCK_EXAM_VIEW_MODE_EVENT, { detail: nextMode }));
    }
  };

  return {
    viewMode,
    isOfficialMode: viewMode === "official",
    setViewMode,
  };
};
