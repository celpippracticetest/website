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

/**
 * Origin for PayPal `return_url` / `cancel_url` (and similar). PayPal validates these URLs; if
 * your API sees the wrong `Host` or `x-forwarded-proto` (common behind proxies or on previews),
 * set `PAYPAL_CHECKOUT_PUBLIC_ORIGIN` to the exact HTTPS origin buyers use (no trailing slash),
 * e.g. `https://celpippracticetest.com`. You can also set `APP_BASE_URL` for the same effect.
 */
export async function getPayPalCheckoutPublicOrigin(): Promise<string> {
  const explicit =
    process.env.PAYPAL_CHECKOUT_PUBLIC_ORIGIN?.trim() ||
    process.env.APP_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  return getRequestOriginFromHeaders();
}
