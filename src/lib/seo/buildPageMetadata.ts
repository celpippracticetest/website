import type { Metadata } from "next";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";
import type { PageSeoItem } from "@/lib/seo/types";

const DEFAULT_SITE_NAME = "CELPIP Practice Test";
const DEFAULT_BASE_URL = "https://celpippracticetest.com";

function siteRoot(): string {
  return (process.env.APP_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function canonicalUrl(path: string): string {
  const root = siteRoot();
  if (!path || path === "/") return `${root}/`;
  return `${root}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Build Next.js `Metadata` from a registry item. */
export function buildPageMetadata(item: PageSeoItem): Metadata {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const indexable =
    item.indexability !== "noindex" &&
    getIndexingRobotsDirective(appBaseUrl).index;
  const robots = indexable
    ? getIndexingRobotsDirective(appBaseUrl)
    : { index: false as const, follow: false as const };

  const canonical = canonicalUrl(item.canonicalPath ?? item.path);
  const ogType = item.openGraphType ?? "website";

  return {
    title: item.title,
    description: item.description,
    ...(item.keywords?.length ? { keywords: item.keywords } : {}),
    alternates: { canonical },
    openGraph: {
      title: item.title,
      description: item.description,
      url: canonical,
      siteName: DEFAULT_SITE_NAME,
      locale: "en_US",
      type: ogType,
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.description,
    },
    robots,
  };
}
