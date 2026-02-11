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

/**
 * Pure function to inject internal links into HTML content.
 * Does NOT fetch data - requires links to be passed in.
 * Safely handles existing tags to avoid breaking HTML structure.
 */
export function linkContentCore(html: string, links: LinkerConfig[]): string {
  if (!html || !links || links.length === 0) return html;

  // Sort links by length (descending) to prioritize longer phrases and specific matches
  const sortedLinks = [...links].sort((a, b) => b.keyword.length - a.keyword.length);

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

  for (const part of parts) {
    // If it's a tag
    if (part.startsWith("<")) {
      processedHtml += part;
      
      // Track if we are inside an anchor tag to avoid nested links
      if (/^<a[\s>]/.test(part)) {
        insideLink = true;
      } else if (part.startsWith("</a>")) {
        insideLink = false;
      }
      continue;
    }

    // If it's text and we're not inside a link, process it
    if (!insideLink && part.trim().length > 0) {
      let text = part;
      
      // Replace keywords with links
      text = text.replace(masterPattern, (match) => {
        const linkConfig = sortedLinks.find(l => l.keyword.toLowerCase() === match.toLowerCase());
        
        if (linkConfig) {
          return `<a href="${linkConfig.url}" class="text-primary hover:underline font-medium" title="Learn more about ${linkConfig.keyword}">${match}</a>`;
        }
        return match;
      });
      
      processedHtml += text;
    } else {
      processedHtml += part;
    }
  }

  return processedHtml;
}
