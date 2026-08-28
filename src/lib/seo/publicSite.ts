/** Public production host for celpippracticetest.com. Unrelated to celpipguide.ca. */
export const PUBLIC_SITE_HOST = "celpippracticetest.com";
export const PUBLIC_SITE_ORIGIN = `https://${PUBLIC_SITE_HOST}`;

const FOREIGN_BRAND_HOSTS = new Set(["celpipguide.ca", "www.celpipguide.ca"]);

export function publicSiteOrigin(raw = process.env.APP_BASE_URL): string {
  const input = (raw ?? "").trim().replace(/\/+$/, "");
  if (!input) return PUBLIC_SITE_ORIGIN;
  try {
    const url = new URL(input.includes("://") ? input : `https://${input}`);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  } catch {
    return PUBLIC_SITE_ORIGIN;
  }
}

function hostnameOf(value: string): string {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isOwnPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const originHost = hostnameOf(publicSiteOrigin()).replace(/^www\./, "");
  return host === PUBLIC_SITE_HOST || host === originHost;
}

export function isForeignBrandHost(hostname: string): boolean {
  return FOREIGN_BRAND_HOSTS.has(hostname.toLowerCase());
}

/**
 * Canonical for a published blog post is always this site's own `/blog/{slug}`.
 * Stored overrides that point at another brand, concatenate URLs, or use a
 * stale slug are ignored so sitemap URLs and canonical tags cannot diverge.
 */
export function resolveBlogCanonicalUrl(
  slug: string,
  storedCanonical?: string | null,
  originRaw?: string,
): string {
  const origin = publicSiteOrigin(originRaw);
  const cleanSlug = slug.trim().replace(/^\/+|\/+$/g, "");
  const self = `${origin}/blog/${cleanSlug}`;
  const raw = storedCanonical?.trim() ?? "";
  if (!raw) return self;
  if ((raw.match(/https?:\/\//gi) ?? []).length > 1) return self;
  try {
    const url = new URL(raw.startsWith("http") ? raw : new URL(raw, origin).href);
    if (isForeignBrandHost(url.hostname) || !isOwnPublicHost(url.hostname)) {
      return self;
    }
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path !== `/blog/${cleanSlug}`) return self;
    return self;
  } catch {
    return self;
  }
}

export function sanitizeBlogSeoCanonical<T extends { canonicalUrl?: string }>(
  slug: string,
  seo: T,
): T {
  return {
    ...seo,
    canonicalUrl: resolveBlogCanonicalUrl(slug, seo.canonicalUrl),
  };
}
