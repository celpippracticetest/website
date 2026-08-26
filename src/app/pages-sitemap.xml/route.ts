import {
  STATIC_SITEMAP_PATHS,
  absoluteSitemapUrl,
  buildUrlSetXml,
  sitemapXmlResponse,
} from "@/lib/sitemap";

export const revalidate = 3600;

export function GET() {
  return sitemapXmlResponse(
    buildUrlSetXml(
      STATIC_SITEMAP_PATHS.map((path) => ({ loc: absoluteSitemapUrl(path) })),
    ),
  );
}
