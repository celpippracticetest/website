/**
 * Validates `next` targets for the mobile app WebView session bridge.
 * Only same-origin relative paths are allowed (no protocol-relative or absolute URLs).
 */
export function safeAppWebRedirectPath(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  if (t.includes("://")) return null;

  const allowedPrefixes = [
    "/exams/",
    "/exam-overview",
    "/practice-overview",
    "/listening/",
    "/reading/",
    "/writing/",
    "/speaking/",
    "/profile",
    "/pricing",
  ];

  if (!allowedPrefixes.some((p) => t.startsWith(p))) {
    return null;
  }

  return t;
}
