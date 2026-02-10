import { internalLinks } from "@/data/internal-links";

/**
 * Escapes special characters in string for RegExp
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Injects internal links into HTML content by replacing keywords with anchor tags.
 * Safely handles existing tags to avoid breaking HTML structure.
 */
export function linkContent(html: string): string {
  if (!html) return html;

  // Sort links by length (descending) to prioritize longer phrases and specific matches
  const sortedLinks = [...internalLinks].sort((a, b) => b.keyword.length - a.keyword.length);

  // Create a master pattern of all keywords
  const patterns = sortedLinks.map(link => {
    const escaped = escapeRegExp(link.keyword);
    // If strict matching is needed we use boundaries, 
    // but for now we'll use boundaries for all to avoid matching inside words
    return `\\b${escaped}\\b`;
  });

  if (patterns.length === 0) return html;

  const masterPattern = new RegExp(`(${patterns.join('|')})`, 'gi');

  // Split by HTML tags to isolate text content
  // The capturing group (<[^>]+>) ensures delimiters are included in the result array
  const parts = html.split(/(<[^>]+>)/g);

  let processedHtml = "";
  let insideLink = false;

  for (const part of parts) {
    // If it's a tag
    if (part.startsWith("<")) {
      processedHtml += part;
      
      // Track if we are inside an anchor tag to avoid nested links
      // Checks for <a (space), <a(tab), <a(newline), or just <a>
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
      // We replace based on the master pattern which prioritizes longer keywords
      text = text.replace(masterPattern, (match) => {
        // Find the corresponding link config
        const linkConfig = sortedLinks.find(l => l.keyword.toLowerCase() === match.toLowerCase());
        
        if (linkConfig) {
          // preserve the original casing of the match
          return `<a href="${linkConfig.url}" class="text-primary hover:underline font-medium" title="Learn more about ${linkConfig.keyword}">${match}</a>`;
        }
        return match;
      });
      
      processedHtml += text;
    } else {
      // Whitespace or empty text nodes
      processedHtml += part;
    }
  }

  return processedHtml;
}
