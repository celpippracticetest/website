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
