/**
 * Google Ads ValueTrack placeholders such as `{campaignid}` are replaced by Google at click
 * time, but a misspelled one (e.g. `{campaign_id}`) reaches the site as literal text and
 * would be stored as the campaign name. Treat any value still holding a `{...}` placeholder
 * as missing, so attribution falls back to `gad_campaignid` / other sources.
 */
const UNRESOLVED_PLACEHOLDER = /\{[^{}]*\}/;

export function hasUnresolvedAdsPlaceholder(value: string): boolean {
  return UNRESOLVED_PLACEHOLDER.test(value);
}

/** Trimmed UTM value, or null when empty or still an unfilled `{...}` placeholder. */
export function cleanUtmValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || hasUnresolvedAdsPlaceholder(trimmed)) return null;
  return trimmed;
}
