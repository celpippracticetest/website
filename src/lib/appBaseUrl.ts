const DEFAULT_APP_BASE_URL = "https://celpippracticetest.com";

/** Normalize APP_BASE_URL so `new URL(relative, base)` never throws in RSC/metadata. */
export function normalizeAppBaseUrl(raw: string | undefined): string {
  const input = (raw ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!input) return DEFAULT_APP_BASE_URL;

  try {
    return new URL(input).toString();
  } catch {
    // continue
  }

  if (/^https?:\/\//i.test(input)) return DEFAULT_APP_BASE_URL;

  const hostPart = input.split("/")[0];
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostPart)) {
    return `http://${input}`;
  }

  return `https://${input}`;
}

export function absoluteAppUrl(path: string): string {
  const base = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  try {
    return new URL(
      normalizedPath,
      base.endsWith("/") ? base : `${base}/`
    ).toString();
  } catch {
    return new URL(
      normalizedPath,
      `${DEFAULT_APP_BASE_URL}/`
    ).toString();
  }
}
