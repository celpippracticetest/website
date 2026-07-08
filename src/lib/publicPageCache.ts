/** Request header set by middleware for anonymous public marketing/wiki/blog traffic. */
export const PUBLIC_PAGE_SKIP_AUTH_HEADER = "x-public-page-skip-auth";

/** ISR + CDN cache window for mostly-static public content. */
export const PUBLIC_PAGE_REVALIDATE_SECONDS = 3600;

export const PUBLIC_PAGE_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";

export const PUBLIC_PAGE_CACHE_HEADERS = {
  "Cache-Control": PUBLIC_PAGE_CACHE_CONTROL,
} as const;
