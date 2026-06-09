import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/buildPageMetadata";
import {
  getPageSeoItem,
  normalizePageSeoPath,
} from "@/lib/seo/pageSeoRegistry";
import type { PageSeoIndexability } from "@/lib/seo/types";

type PageSeoOverrides = Partial<
  Pick<PageSeoItem, "title" | "description" | "keywords" | "canonicalPath" | "openGraphType">
> & {
  indexability?: PageSeoIndexability;
};

/**
 * Resolve static route metadata from the central SEO registry.
 *
 * @example
 * export const metadata = pageSeo("/profile");
 */
export function pageSeo(path: string, overrides?: PageSeoOverrides): Metadata {
  const key = normalizePageSeoPath(path);
  const base = getPageSeoItem(key);
  if (!base) {
    console.warn(`[pageSeo] No registry entry for path: ${key}`);
    return buildPageMetadata({
      path: key,
      title: "CELPIP Practice Test",
      description: "CELPIP practice tests with AI scoring and mock exams.",
      indexability: overrides?.indexability ?? "noindex",
      ...overrides,
    });
  }

  return buildPageMetadata({
    ...base,
    ...overrides,
    path: key,
    indexability: overrides?.indexability ?? base.indexability,
  });
}

export { buildPageMetadata } from "@/lib/seo/buildPageMetadata";
export { cmsPageSeo } from "@/lib/seo/cmsPageSeo";
export {
  getPageSeoItem,
  listPageSeoItems,
  normalizePageSeoPath,
  PAGE_SEO_REGISTRY,
} from "@/lib/seo/pageSeoRegistry";
export type { PageSeoItem, PageSeoIndexability } from "@/lib/seo/types";
