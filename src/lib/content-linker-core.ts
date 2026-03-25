/**
 * Core interface for internal links used by the linker
 */
export interface LinkerConfig {
  keyword: string;
  url: string;
  exactMatch: boolean;
}

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
      // Track if we are inside an anchor tag to avoid nested links.
      // Additionally, if the anchor points to the current page, strip it
      // (turn into plain text) to prevent self-linking even when the HTML
      // already contains an <a> tag.
      if (/^<a[\s>]/.test(part)) {
        const hrefMatch = part.match(/href\s*=\s*["']([^"']+)["']/i);
        const href = hrefMatch?.[1] ?? "";
        const isSelfAnchor =
          !!normalizedCurrentPath && href
            ? normalizeToPath(href) === normalizedCurrentPath
            : false;

        if (!isSelfAnchor) processedHtml += part;
        insideLink = true;
        insideSelfAnchor = isSelfAnchor;
      } else if (part.startsWith("</a>")) {
        if (!insideSelfAnchor) processedHtml += part;
        insideLink = false;
        insideSelfAnchor = false;
      } else {
        processedHtml += part;
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
          return `<a href="${linkConfig.url}" class="text-primary hover:underline font-medium" title="Learn more about ${linkConfig.keyword}">${match}</a>`;
        }

        const linkConfig = candidates[0];
        return `<a href="${linkConfig.url}" class="text-primary hover:underline font-medium" title="Learn more about ${linkConfig.keyword}">${match}</a>`;
      });
      
      processedHtml += text;
    } else {
      processedHtml += part;
    }
  }

  return processedHtml;
}
