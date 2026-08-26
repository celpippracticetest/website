import {
  buildSitemapIndexXml,
  sitemapXmlResponse,
} from "@/lib/sitemap";

export const revalidate = 3600;

export function GET() {
  return sitemapXmlResponse(
    buildSitemapIndexXml(["/pages-sitemap.xml", "/blog-sitemap.xml"]),
  );
}
