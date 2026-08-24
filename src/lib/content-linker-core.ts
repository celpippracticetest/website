/**
 * Core interface for internal links used by the linker
 */
export interface LinkerConfig {
  keyword: string;
  url: string;
  exactMatch: boolean;
}

const CANONICAL_HOST = "celpippracticetest.com";
const INTERNAL_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);

/**
 * Escapes special characters in string for RegExp
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeToPath(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  // Strip query/hash for consistent comparisons.
  const withoutQueryOrHash = raw.split(/[?#]/)[0]!;

  try {
    // If it's a full URL, extract its pathname.
    if (/^https?:\/\//i.test(withoutQueryOrHash)) {
      return new URL(withoutQueryOrHash).pathname.toLowerCase().replace(/\/+$/, "") || "/";
    }
  } catch {
    // Fall through to relative-path normalization.
  }

  // Relative path (or just a pathname).
  const withLeadingSlash = withoutQueryOrHash.startsWith("/") ? withoutQueryOrHash : `/${withoutQueryOrHash}`;
  return withLeadingSlash.toLowerCase().replace(/\/+$/, "") || "/";
}

function isInternalHref(input: string): boolean {
  const raw = (input ?? "").trim();
  if (!raw) return false;
  if (raw.startsWith("/") || raw.startsWith("#") || raw.startsWith("?")) return true;

  try {
    const url = new URL(raw);
    return INTERNAL_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function normalizeInternalHref(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw || !isInternalHref(raw)) return raw;

  if (raw.startsWith("/") || raw.startsWith("#") || raw.startsWith("?")) {
    return raw;
  }

  try {
    const url = new URL(raw);
    return `https://${CANONICAL_HOST}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return raw;
  }
}

function sanitizeAnchorTag(tag: string): string {
  const hrefMatch = tag.match(/href\s*=\s*(["'])([^"']+)\1/i);
  let nextTag = tag;
  let normalizedHref = "";

  if (hrefMatch) {
    normalizedHref = normalizeInternalHref(hrefMatch[2] ?? "");
    if (normalizedHref && normalizedHref !== hrefMatch[2]) {
      nextTag = nextTag.replace(hrefMatch[0], `href=${hrefMatch[1]}${normalizedHref}${hrefMatch[1]}`);
    }
  }

  if (normalizedHref && isInternalHref(normalizedHref)) {
    // Stay on this tab for on-site links. `target="_blank"` makes the
    // destination feel like it opened "somewhere else".
    nextTag = nextTag.replace(/\s*target\s*=\s*(["'])[^"']*\1/i, "");
    nextTag = nextTag.replace(/\srel\s*=\s*(["'])([^"']*)\1/i, (_match, quote: string, value: string) => {
      const tokens = value
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => {
          const lower = token.toLowerCase();
          return lower !== "nofollow" && lower !== "noopener" && lower !== "noreferrer";
        });

      return tokens.length > 0 ? ` rel=${quote}${tokens.join(" ")}${quote}` : "";
    });
  }

  return nextTag;
}

function sanitizeContentTag(tag: string): string {
  if (/^<a[\s>]/i.test(tag)) {
    return sanitizeAnchorTag(tag);
  }

  if (/^<h1([\s>])/i.test(tag)) {
    return tag.replace(/^<h1([\s>])/i, "<h2$1");
  }

  if (/^<\/h1>/i.test(tag)) {
    return "</h2>";
  }

  return tag;
}

/**
 * Keep wide tables scrollable without putting overflow-x-auto on the whole
 * article (that offsets in-content link hitboxes away from the visible text).
 */
function wrapTablesForScroll(html: string): string {
  if (!/<table\b/i.test(html)) return html;

  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (table, offset: number) => {
    const before = html.slice(Math.max(0, offset - 120), offset);
    if (/article-table-scroll[^>]*>\s*$/i.test(before)) return table;
    return `<div class="article-table-scroll">${table}</div>`;
  });
}

/**
 * Normalize tags and strip self-links. Keeps authored <a> tags in the HTML
 * so blog (and other) content links stay clickable.
 */
export function sanitizeContentHtml(html: string, currentPath?: string): string {
  if (!html) return html;

  const normalizedCurrentPath = currentPath ? normalizeToPath(currentPath) : "";
  const parts = html.split(/(<[^>]+>)/g);
  let processedHtml = "";
  let insideSelfAnchor = false;

  for (const part of parts) {
    if (part.startsWith("<")) {
      const sanitizedTag = sanitizeContentTag(part);

      if (/^<a[\s>]/i.test(sanitizedTag)) {
        const hrefMatch = sanitizedTag.match(/href\s*=\s*["']([^"']+)["']/i);
        const href = hrefMatch?.[1] ?? "";
        const isSelfAnchor =
          !!normalizedCurrentPath && href
            ? normalizeToPath(href) === normalizedCurrentPath
            : false;

        if (!isSelfAnchor) processedHtml += sanitizedTag;
        insideSelfAnchor = isSelfAnchor;
      } else if (/^<\/a>/i.test(sanitizedTag)) {
        if (!insideSelfAnchor) processedHtml += sanitizedTag;
        insideSelfAnchor = false;
      } else {
        processedHtml += sanitizedTag;
      }
      continue;
    }

    processedHtml += part;
  }

  return wrapTablesForScroll(processedHtml);
}

/**
 * Pure function to inject internal links into HTML content.
 * Does NOT fetch data - requires links to be passed in.
 * Safely handles existing tags to avoid breaking HTML structure.
 */
export function linkContentCore(
  html: string,
  links: LinkerConfig[],
  currentPath?: string
): string {
  const prepared = sanitizeContentHtml(html, currentPath);
  if (!prepared || !links || links.length === 0) return prepared;

  // Avoid "self links" where a keyword would link to the page currently being rendered.
  // Example: keyword "CLB 9" targeting "/wiki/clb9" should not be linked inside "/wiki/clb9".
  const normalizedCurrentPath = currentPath ? normalizeToPath(currentPath) : "";
  const filteredLinks =
    normalizedCurrentPath
      ? links.filter((l) => normalizeToPath(l.url) !== normalizedCurrentPath)
      : links;

  // Sort links by length (descending) to prioritize longer phrases and specific matches
  const sortedLinks = [...filteredLinks].sort((a, b) => b.keyword.length - a.keyword.length);

  // Create a master pattern of all keywords
  const patterns = sortedLinks.map(link => {
    const escaped = escapeRegExp(link.keyword);
    // If strict matching is needed we use boundaries
    return `\\b${escaped}\\b`;
  });

  if (patterns.length === 0) return prepared;

  const masterPattern = new RegExp(`(${patterns.join('|')})`, 'gi');

  // Split by HTML tags to isolate text content
  const parts = prepared.split(/(<[^>]+>)/g);

  let processedHtml = "";
  let insideLink = false;

  for (const part of parts) {
    if (part.startsWith("<")) {
      if (/^<a[\s>]/i.test(part)) {
        processedHtml += part;
        insideLink = true;
      } else if (/^<\/a>/i.test(part)) {
        processedHtml += part;
        insideLink = false;
      } else {
        processedHtml += part;
      }
      continue;
    }

    if (!insideLink && part.trim().length > 0) {
      const text = part.replace(masterPattern, (match) => {
        const candidates = sortedLinks.filter(
          (l) => l.keyword.toLowerCase() === match.toLowerCase()
        );
        if (candidates.length === 0) return match;

        const linkConfig = normalizedCurrentPath
          ? candidates.find((l) => normalizeToPath(l.url) !== normalizedCurrentPath)
          : candidates[0];
        if (!linkConfig) return match;

        return `<a href="${normalizeInternalHref(linkConfig.url)}" class="cel-internal-kw-link text-primary font-medium no-underline hover:no-underline" title="Learn more about ${linkConfig.keyword}">${match}</a>`;
      });

      processedHtml += text;
    } else {
      processedHtml += part;
    }
  }

  return processedHtml;
}
