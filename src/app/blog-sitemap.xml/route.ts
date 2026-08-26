import { getPublishedBlogSlugs } from "@/lib/blog/public";
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from "@/lib/publicPageCache";
import {
  absoluteSitemapUrl,
  buildUrlSetXml,
  sitemapXmlResponse,
} from "@/lib/sitemap";

export const revalidate = PUBLIC_PAGE_REVALIDATE_SECONDS;

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
