import type { Metadata } from "next";
import { getPageSeoItem, normalizePageSeoPath } from "@/lib/seo/pageSeoRegistry";

/**
 * Title + description for CMS routes. Robots/noindex come from `app/cms/layout.tsx`.
 */
export function cmsPageSeo(path: string): Metadata {
  const item = getPageSeoItem(normalizePageSeoPath(path));
  if (!item) {
    return { title: "CMS" };
  }
  return {
    title: item.title,
    description: item.description,
  };
}
