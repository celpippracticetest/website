/** Run non-urgent work after the browser paints (INP-friendly). */
export function scheduleIdleTask(task: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(task, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 0);
  return () => window.clearTimeout(id);
}
