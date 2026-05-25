/** In-process cache for GA4 live-stats to stay under Data API quotas. */

export const GA4_LIVE_STATS_CACHE_TTL_MS = 90_000;
export const GA4_LIVE_STATS_STALE_MAX_MS = 10 * 60_000;

export type LiveStatsJsonBody = Record<string, unknown>;

type CacheEntry = {
  body: LiveStatsJsonBody;
  cachedAt: number;
  expiresAt: number;
};

let entry: CacheEntry | null = null;
let inFlight: Promise<LiveStatsJsonBody> | null = null;

export function getGa4LiveStatsCacheEntry(): CacheEntry | null {
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

export function getStaleGa4LiveStatsBody(): LiveStatsJsonBody | null {
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > GA4_LIVE_STATS_STALE_MAX_MS) return null;
  return entry.body;
}

export async function getOrFetchGa4LiveStats(
  fetchFresh: () => Promise<LiveStatsJsonBody>,
): Promise<LiveStatsJsonBody> {
  const hit = getGa4LiveStatsCacheEntry();
  if (hit) return hit.body;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const body = await fetchFresh();
      const now = Date.now();
      if (body.success === true) {
        entry = {
          body,
          cachedAt: now,
          expiresAt: now + GA4_LIVE_STATS_CACHE_TTL_MS,
        };
      }
      return body;
    } catch (err) {
      const stale = getStaleGa4LiveStatsBody();
      if (stale) {
        console.warn("[GA4] live-stats fetch failed; serving stale cache", err);
        return stale;
      }
      throw err;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export const GA4_LIVE_STATS_CACHE_CONTROL =
  "public, s-maxage=90, stale-while-revalidate=120";
