/**
 * Progress bar that approaches ~92% while waiting on a long API call, then
 * completes when the caller clears the interval.
 */
export function startPracticeSubmitProgress(
  setProgress: (value: number | ((prev: number) => number)) => void,
  options?: { tickMs?: number; cap?: number }
): () => void {
  const tickMs = options?.tickMs ?? 400;
  const cap = options?.cap ?? 92;

  setProgress(0);

  const interval = setInterval(() => {
    setProgress((prev) => {
      if (prev >= cap) return prev;
      const remaining = cap - prev;
      const step = Math.max(0.5, remaining * 0.08);
      return Math.min(cap, prev + step);
    });
  }, tickMs);

  return () => clearInterval(interval);
}
