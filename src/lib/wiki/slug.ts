/**
 * Canonical URL slug helpers (wiki + blog share the same rules as `*WriteSchema.slug`).
 */

/** Decode a path segment (`%20`, `+`, Unicode escapes); safe on malformed input. */
export function decodeWikiPathSlug(raw: string): string {
  if (typeof raw !== "string") return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

/**
 * Canonical slug for JSON / Mongo / CMS fields (no URI decoding).
 * Matches Postgres migration expression on `wiki_articles.slug`.
 */
export function normalizeWikiSlugStorage(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Canonical slug for URL `[slug]` params and API lookups from browsers.
 * Decodes first so `/wiki/foo%20bar` resolves like `foo-bar`.
 */
export function normalizeWikiSlug(raw: string): string {
  return normalizeWikiSlugStorage(decodeWikiPathSlug(raw));
}
