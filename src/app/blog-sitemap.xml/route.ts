import { getPublishedBlogSlugs } from "@/lib/blog/public";
import {
  absoluteSitemapUrl,
  buildUrlSetXml,
  sitemapXmlResponse,
} from "@/lib/sitemap";

export const revalidate = 3600;

export async function GET() {
  const posts = await getPublishedBlogSlugs();
  const xml = buildUrlSetXml(
    posts.map((post) => ({
      loc: absoluteSitemapUrl(`/blog/${post.slug}`),
      lastmod: new Date(post.updatedAt).toISOString(),
    })),
  );

  return sitemapXmlResponse(xml);
}
