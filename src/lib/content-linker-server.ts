import { internalLinks as fallbackLinks } from "@/data/internal-links";
import { getDb } from "@/lib/mongodb";
import { unstable_cache } from "next/cache";
import { linkContentCore, LinkerConfig } from "./content-linker-core";

/**
 * Fetches internal links from the database (cached)
 */
const getCachedInternalLinks = unstable_cache(
  async (): Promise<LinkerConfig[]> => {
    try {
      const db = await getDb();
      const links = await db.collection("internalLinks").find().toArray();
      
      if (links.length === 0) {
        return fallbackLinks.map(l => ({
            keyword: l.keyword,
            url: l.url,
            exactMatch: l.exactMatch || false
        }));
      }

      return links.map(link => ({
        keyword: link.keyword,
        url: link.url,
        exactMatch: link.exactMatch || false
      }));
    } catch (error) {
      console.error("Failed to fetch internal links, using fallback:", error);
      return fallbackLinks.map(l => ({
        keyword: l.keyword,
        url: l.url,
        exactMatch: l.exactMatch || false
      }));
    }
  },
  ["internal-links"],
  { revalidate: 3600 } // Cache for 1 hour
);

/**
 * Server-side wrapper that fetches links and applies them to content.
 * Intended for use in Server Components only.
 */
export async function linkContentServer(html: string): Promise<string> {
  const links = await getCachedInternalLinks();
  return linkContentCore(html, links);
}
