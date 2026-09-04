import { create } from "zustand";
import {
  markNpsDismissed,
  markNpsSubmitted,
  recordPracticeCompletedForNps,
  resetNpsPracticeCount,
  shouldPromptNps,
} from "@/lib/nps";

export type NpsTrigger = "mock_leave" | "practice_milestone";

type NpsStore = {
  isOpen: boolean;
  trigger: NpsTrigger | null;
  contextLabel: string;
  pendingHref: string | null;
  /** When true, intercept navigation away from mock results. */
  mockLeaveArmed: boolean;
  mockContextLabel: string;
  userId: string | null;

  setUserId: (userId: string | null) => void;
  hydrateSubmittedFromServer: () => void;
  armMockLeave: (contextLabel: string) => void;
  disarmMockLeave: () => void;
  open: (opts: {
    trigger: NpsTrigger;
    contextLabel: string;
    pendingHref?: string | null;
  }) => void;
  /** Returns true if navigation was blocked and NPS opened. */
  tryInterceptNavigation: (href: string) => boolean;
  onPracticeCompleted: (contextLabel: string) => void;
  dismiss: () => void;
  completeSubmit: () => void;
  clearPendingAndNavigate: (navigate: (href: string) => void) => void;
};

export const useNpsStore = create<NpsStore>((set, get) => ({
  isOpen: false,
  trigger: null,
  contextLabel: "",
  pendingHref: null,
  mockLeaveArmed: false,
  mockContextLabel: "",
  userId: null,

  setUserId: (userId) => set({ userId }),

  hydrateSubmittedFromServer: () => {
    const { userId } = get();
    if (!userId || typeof window === "undefined") return;
    if (!shouldPromptNps(userId)) return;

    void fetch("/api/nps")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { submitted?: boolean } | null) => {
        if (!body?.submitted) return;
        markNpsSubmitted(userId);
        if (get().isOpen) {
          set({ isOpen: false, trigger: null, pendingHref: null });
        }
      })
      .catch(() => {
        /* ignore — localStorage remains the fallback */
      });
  },

  armMockLeave: (contextLabel) =>
    set({ mockLeaveArmed: true, mockContextLabel: contextLabel }),

  disarmMockLeave: () =>
    set({ mockLeaveArmed: false, mockContextLabel: "" }),

  open: ({ trigger, contextLabel, pendingHref = null }) => {
    const { userId, isOpen } = get();
    if (isOpen) return;
    if (!shouldPromptNps(userId)) return;

    if (trigger === "practice_milestone") {
      resetNpsPracticeCount(userId);
    }

    set({
      isOpen: true,
      trigger,
      contextLabel,
      pendingHref,
    });
  },

  tryInterceptNavigation: (href) => {
    const { mockLeaveArmed, mockContextLabel, userId, isOpen, open } = get();
    if (!mockLeaveArmed || isOpen) return false;
    if (!shouldPromptNps(userId)) return false;

    open({
      trigger: "mock_leave",
      contextLabel: mockContextLabel || "Mock exam complete",
      pendingHref: href,
    });
    return true;
  },

  onPracticeCompleted: (contextLabel) => {
    const { userId, isOpen, mockLeaveArmed, open } = get();
    if (isOpen || mockLeaveArmed) return;

    // Dedupe rapid double-logs from overlapping practice submit paths
    const now = Date.now();
    const dedupeKey = `${userId ?? "anon"}:${contextLabel}`;
    const g = globalThis as unknown as {
      __npsPracticeDedupe?: { key: string; at: number };
    };
    if (g.__npsPracticeDedupe && g.__npsPracticeDedupe.key === dedupeKey && now - g.__npsPracticeDedupe.at < 8000) {
      return;
    }
    g.__npsPracticeDedupe = { key: dedupeKey, at: now };

    if (!recordPracticeCompletedForNps(userId)) return;

    // Small delay so practice result UI can paint first
    setTimeout(() => {
      open({
        trigger: "practice_milestone",
        contextLabel,
      });
    }, 600);
  },

  dismiss: () => {
    const { userId } = get();
    markNpsDismissed(userId);
    set({
      isOpen: false,
      trigger: null,
      pendingHref: null,
    });
  },

  completeSubmit: () => {
    const { userId } = get();
    markNpsSubmitted(userId);
  },

  clearPendingAndNavigate: (navigate) => {
    const { pendingHref } = get();
    const href = pendingHref;
    set({
      isOpen: false,
      trigger: null,
      pendingHref: null,
      // Allow the pending navigation without re-prompting
      mockLeaveArmed: false,
    });
    if (href) {
      navigate(href);
    }
  },
}));
