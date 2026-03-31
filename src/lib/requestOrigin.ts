import { headers } from "next/headers";

/**
 * Public origin for the current request (scheme + host), for absolute redirects
 * (e.g. Clerk `redirect_url` after sign-in token).
 */
export async function getRequestOriginFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const forwarded = h.get("x-forwarded-proto");
    const local =
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.startsWith("[::1]");
    const proto =
      forwarded ??
      (local ? "http" : "https");
    return `${proto}://${host}`;
  }
  const fallback = process.env.APP_BASE_URL?.trim() || "https://celpippracticetest.com";
  return fallback.replace(/\/+$/, "");
}
