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

      return links.map(link => ({
        keyword: link.keyword,
        url: link.url,
        exactMatch: link.exactMatch || false
      }));
    } catch (error) {
      console.error("Failed to fetch internal links:", error);
      return [];
    }
  },
  ["internal-links"],
  { revalidate: 3600 } // Cache for 1 hour
);

/**
 * Server-side wrapper that fetches links and applies them to content.
 * Intended for use in Server Components only.
 */
export async function linkContentServer(
  html: string,
  currentPath?: string
): Promise<string> {
  const links = await getCachedInternalLinks();
  return linkContentCore(html, links, currentPath);
}
