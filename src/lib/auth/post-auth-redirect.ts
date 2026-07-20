/** Canonical destination after login / signup when no return URL is provided. */
export const DEFAULT_POST_AUTH_PATH = "/practice-overview";

/**
 * Same-origin path only (query allowed); blocks open redirects.
 * Falls back to {@link DEFAULT_POST_AUTH_PATH}.
 */
export function resolvePostAuthRedirect(
  raw: string | string[] | null | undefined
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null) return DEFAULT_POST_AUTH_PATH;
  const t = value.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return DEFAULT_POST_AUTH_PATH;
  if (t.includes("://") || t.includes("\\")) return DEFAULT_POST_AUTH_PATH;
  return t;
}
