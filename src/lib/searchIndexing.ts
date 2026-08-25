/** Custom domain used for Vercel preview / staging. Must stay noindex. */
export const PREVIEW_APP_HOST = "pre.celpippracticetest.com";

function normalizeHost(value: string | undefined | null): string | null {
  const input = (value ?? "").trim();
  if (!input) return null;

  try {
    const withScheme = input.includes("://") ? input : `https://${input}`;
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    const host = input.replace(/^https?:\/\//i, "").split("/")[0]?.toLowerCase();
    return host || null;
  }
}

function hostIndicatesNonIndexable(host: string): boolean {
  const normalized = host.toLowerCase();
  return normalized === PREVIEW_APP_HOST || normalized.endsWith(".vercel.app");
}

/** True when this deployment should not appear in search indexes. */
export function isNonIndexableDeployment(appBaseUrl?: string | null): boolean {
  if (process.env.VERCEL_ENV === "preview") {
    return true;
  }

  // Do not use VERCEL_URL here: every Vercel deployment (including Production on a
  // custom domain) has a *.vercel.app alias, which would incorrectly noindex prod.
  const hosts = [
    normalizeHost(appBaseUrl),
    normalizeHost(process.env.APP_BASE_URL),
    normalizeHost(process.env.NEXT_PUBLIC_APP_URL),
  ].filter((host): host is string => Boolean(host));

  return hosts.some(hostIndicatesNonIndexable);
}

export const NOINDEX_ROBOTS = {
  index: false as const,
  follow: false as const,
};

export const NOINDEX_X_ROBOTS_TAG = "noindex, nofollow";

export function getIndexingRobotsDirective(
  appBaseUrl?: string | null,
): { index: boolean; follow: boolean } {
  const blocked = isNonIndexableDeployment(appBaseUrl);
  return { index: !blocked, follow: !blocked };
}
