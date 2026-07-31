export const NPS_PRACTICE_THRESHOLD = 5;

export type NpsReadiness = "not_really" | "somewhat" | "a_lot_more";

export type NpsPersistedState = {
  /** User already submitted feedback — stop prompting. */
  submitted: boolean;
  /** Closed without submitting — remind on next mock leave or next 5 practices. */
  pendingReminder: boolean;
  /** Practices completed since last prompt / dismiss / submit. */
  practiceCount: number;
  lastSubmittedAt?: string;
  lastDismissedAt?: string;
};

const DEFAULT_STATE: NpsPersistedState = {
  submitted: false,
  pendingReminder: false,
  practiceCount: 0,
};

function storageKey(userId?: string | null): string {
  return userId ? `celpip_nps_${userId}` : "celpip_nps_anon";
}

export function readNpsState(userId?: string | null): NpsPersistedState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<NpsPersistedState>;
    return {
      submitted: Boolean(parsed.submitted),
      pendingReminder: Boolean(parsed.pendingReminder),
      practiceCount: Number(parsed.practiceCount) || 0,
      lastSubmittedAt: parsed.lastSubmittedAt,
      lastDismissedAt: parsed.lastDismissedAt,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeNpsState(
  state: NpsPersistedState,
  userId?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function shouldPromptNps(userId?: string | null): boolean {
  const state = readNpsState(userId);
  return !state.submitted;
}

/** After a practice completes — returns whether the modal should open now. */
export function recordPracticeCompletedForNps(
  userId?: string | null,
): boolean {
  const state = readNpsState(userId);
  if (state.submitted) return false;

  const next: NpsPersistedState = {
    ...state,
    practiceCount: state.practiceCount + 1,
  };
  writeNpsState(next, userId);

  if (next.practiceCount >= NPS_PRACTICE_THRESHOLD) {
    return true;
  }
  return false;
}

export function markNpsDismissed(userId?: string | null): void {
  writeNpsState(
    {
      submitted: false,
      pendingReminder: true,
      practiceCount: 0,
      lastDismissedAt: new Date().toISOString(),
    },
    userId,
  );
}

export function markNpsSubmitted(userId?: string | null): void {
  writeNpsState(
    {
      submitted: true,
      pendingReminder: false,
      practiceCount: 0,
      lastSubmittedAt: new Date().toISOString(),
    },
    userId,
  );
}

/** Reset the practice counter after we successfully opened a practice prompt. */
export function resetNpsPracticeCount(userId?: string | null): void {
  const state = readNpsState(userId);
  writeNpsState({ ...state, practiceCount: 0 }, userId);
}

/**
 * Leaving mock results for another area of the app (not attempt switch / continue part).
 */
export function isLeavingMockResults(
  currentPath: string,
  targetHref: string,
): boolean {
  if (!currentPath.includes("/results")) return false;

  let path = targetHref;
  try {
    if (targetHref.startsWith("http")) {
      path = new URL(targetHref).pathname;
    }
  } catch {
    return false;
  }

  const pathname = path.split("?")[0] || "";
  if (!pathname || pathname === "#" || pathname.startsWith("#")) return false;

  // Stay on results (e.g. switch attempt)
  if (pathname.includes("/results")) return false;

  // Continue an incomplete section of the same mock
  if (/\/exams\/exam_[^/]+\/part\d+/i.test(pathname)) return false;
  if (/\/exams\/exam_[^/]+\/\d+/i.test(pathname)) return false;

  return true;
}

export function readinessLabel(value: NpsReadiness): string {
  switch (value) {
    case "not_really":
      return "Not really";
    case "somewhat":
      return "Somewhat";
    case "a_lot_more":
      return "A lot more";
  }
}
