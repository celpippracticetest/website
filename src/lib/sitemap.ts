import { PUBLIC_PAGE_CACHE_CONTROL } from "@/lib/publicPageCache";

export const SITEMAP_ORIGIN = "https://celpippracticetest.com";

export const STATIC_SITEMAP_PATHS = [
  "/",
  "/listening",
  "/reading",
  "/writing",
  "/speaking",
  "/pricing",
  "/blog",
] as const;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function absoluteSitemapUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path === "/") {
    return `${SITEMAP_ORIGIN}/`;
  }
  return `${SITEMAP_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function sitemapXmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": PUBLIC_PAGE_CACHE_CONTROL,
    },
  });
}

export function buildSitemapIndexXml(sitemapPaths: string[]): string {
  const entries = sitemapPaths
    .map(
      (path) => `    <sitemap>
        <loc>${escapeXml(absoluteSitemapUrl(path))}</loc>
    </sitemap>`,
    )
    .join("\n\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

export function buildUrlSetXml(
  urls: Array<{ loc: string; lastmod?: string }>,
): string {
  const entries = urls
    .map((url) => {
      const lastmod = url.lastmod
        ? `\n        <lastmod>${escapeXml(url.lastmod)}</lastmod>`
        : "";
      return `    <url>
        <loc>${escapeXml(url.loc)}</loc>${lastmod}
    </url>`;
    })
    .join("\n\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}
