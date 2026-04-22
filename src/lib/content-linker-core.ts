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
    nextTag = nextTag.replace(/\srel\s*=\s*(["'])([^"']*)\1/i, (_match, quote: string, value: string) => {
      const tokens = value
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => token.toLowerCase() !== "nofollow");

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
 * Pure function to inject internal links into HTML content.
 * Does NOT fetch data - requires links to be passed in.
 * Safely handles existing tags to avoid breaking HTML structure.
 */
export function linkContentCore(
  html: string,
  links: LinkerConfig[],
  currentPath?: string
): string {
  if (!html || !links || links.length === 0) return html;

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

  if (patterns.length === 0) return html;

  const masterPattern = new RegExp(`(${patterns.join('|')})`, 'gi');

  // Split by HTML tags to isolate text content
  const parts = html.split(/(<[^>]+>)/g);

  let processedHtml = "";
  let insideLink = false;
  let insideSelfAnchor = false;

  for (const part of parts) {
    // If it's a tag
    if (part.startsWith("<")) {
      const sanitizedTag = sanitizeContentTag(part);

      // Track if we are inside an anchor tag to avoid nested links.
      // Additionally, if the anchor points to the current page, strip it
      // (turn into plain text) to prevent self-linking even when the HTML
      // already contains an <a> tag.
      if (/^<a[\s>]/i.test(sanitizedTag)) {
        const hrefMatch = sanitizedTag.match(/href\s*=\s*["']([^"']+)["']/i);
        const href = hrefMatch?.[1] ?? "";
        const isSelfAnchor =
          !!normalizedCurrentPath && href
            ? normalizeToPath(href) === normalizedCurrentPath
            : false;

        if (!isSelfAnchor) processedHtml += sanitizedTag;
        insideLink = true;
        insideSelfAnchor = isSelfAnchor;
      } else if (/^<\/a>/i.test(sanitizedTag)) {
        if (!insideSelfAnchor) processedHtml += sanitizedTag;
        insideLink = false;
        insideSelfAnchor = false;
      } else {
        processedHtml += sanitizedTag;
      }
      continue;
    }

    // If it's text and we're not inside a link, process it
    if (!insideLink && part.trim().length > 0) {
      let text = part;
      
      // Replace keywords with links
      text = text.replace(masterPattern, (match) => {
        const candidates = sortedLinks.filter(
          (l) => l.keyword.toLowerCase() === match.toLowerCase()
        );
        if (candidates.length === 0) return match;

        // If we couldn't filter them out correctly for any reason, still prevent
        // linking to the current page at render time.
        if (normalizedCurrentPath) {
          const nonSelf = candidates.find(
            (l) => normalizeToPath(l.url) !== normalizedCurrentPath
          );
          if (!nonSelf) return match;
          const linkConfig = nonSelf;
          return `<a href="${normalizeInternalHref(linkConfig.url)}" class="cel-internal-kw-link text-primary font-medium no-underline hover:no-underline" title="Learn more about ${linkConfig.keyword}">${match}</a>`;
        }

        const linkConfig = candidates[0];
        return `<a href="${normalizeInternalHref(linkConfig.url)}" class="cel-internal-kw-link text-primary font-medium no-underline hover:no-underline" title="Learn more about ${linkConfig.keyword}">${match}</a>`;
      });
      
      processedHtml += text;
    } else {
      processedHtml += part;
    }
  }

  return processedHtml;
}
