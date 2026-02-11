import { internalLinks as fallbackLinks } from "@/data/internal-links";
import { getDb } from "@/lib/mongodb";
import { unstable_cache } from "next/cache";

/**
 * Escapes special characters in string for RegExp
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fetches internal links from the database (cached)
 */
const getCachedInternalLinks = unstable_cache(
  async () => {
    try {
      const db = await getDb();
      const links = await db.collection("internalLinks").find().toArray();
      
      if (links.length === 0) return fallbackLinks;

      return links.map(link => ({
        keyword: link.keyword,
        url: link.url,
        exactMatch: link.exactMatch || false
      }));
    } catch (error) {
      console.error("Failed to fetch internal links, using fallback:", error);
      return fallbackLinks;
    }
  },
  ["internal-links"],
  { revalidate: 3600 } // Cache for 1 hour
);

/**
 * Injects internal links into HTML content by replacing keywords with anchor tags.
 * Safely handles existing tags to avoid breaking HTML structure.
 * Now async to support DB fetching.
 */
export async function linkContent(html: string): Promise<string> {
  if (!html) return html;

  const links = await getCachedInternalLinks();

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
