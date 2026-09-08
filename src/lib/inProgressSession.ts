const PREFIX = "inProgress:";

export type ObjectiveInProgress = {
  page?: string;
  time: number;
  selectedAnswers: Record<string, string>;
  text?: string;
};

export function inProgressKey(parts: Array<string | number | null | undefined>) {
  return PREFIX + parts.filter(Boolean).join(":");
}

export function readInProgress<T>(key: string | null | undefined): T | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeInProgress(key: string | null | undefined, value: unknown) {
  if (!key || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota */
  }
}

export function clearInProgress(key: string | null | undefined) {
  if (!key || typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const FRESH_ATTEMPT_PREFIX = "freshPracticeAttempt:";

export function freshPracticeAttemptKey(
  skill: string,
  taskId: string | null | undefined,
) {
  return FRESH_ATTEMPT_PREFIX + [skill, taskId].filter(Boolean).join(":");
}

/** Skip restoring submitted answers until the task attempt is finished. */
export function beginFreshPracticeAttempt(
  skill: string,
  taskId: string | null | undefined,
  practiceIds: string[] = [],
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(freshPracticeAttemptKey(skill, taskId), "1");
    for (const id of practiceIds) {
      clearInProgress(inProgressKey(["practice", id]));
    }
  } catch {
    /* private mode / quota */
  }
}

export function isFreshPracticeAttempt(
  skill: string,
  taskId: string | null | undefined,
) {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(freshPracticeAttemptKey(skill, taskId)) === "1";
  } catch {
    return false;
  }
}

export function endFreshPracticeAttempt(
  skill: string,
  taskId: string | null | undefined,
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(freshPracticeAttemptKey(skill, taskId));
  } catch {
    /* ignore */
  }
}
