import { cache } from "react";
import documentsClient from "@/lib/appDocumentsClient";
import { TBlogSchemaDto } from "@/models/blog.model";
import { BlogRepository } from "@/repositories/blog.repo";

/** Typo / retired CMS slugs → permanent redirect targets. */
const LEGACY_BLOG_SLUG_REDIRECTS: Record<string, string> = {
  "celpip-leauage": "/blog/complete-guide-celpip-test-booking-results-clb",
  "celpip-general-vs-ls-comparison": "/blog/celpip-ls-vs-general",
  "10-common-celpip-mistakes-that-cost-you-points-and-how-to-fix-them":
    "/blog/most-common-celpip-mistakes",
  "celpip-vs-ielts-format-fees-scoring": "/blog/celpip-vs-ieltes",
};

const NON_INDEXABLE_LEGACY_BLOG_SLUGS = new Set(Object.keys(LEGACY_BLOG_SLUG_REDIRECTS));

export function isIndexablePublishedBlogSlug(slug: string): boolean {
  return !NON_INDEXABLE_LEGACY_BLOG_SLUGS.has(slug.trim().toLowerCase());
}

export function getLegacyBlogSlugRedirect(slug: string): string | null {
  return LEGACY_BLOG_SLUG_REDIRECTS[slug.trim().toLowerCase()] ?? null;
}

export async function getPublishedBlogPosts(
  page: number = 0,
  limit: number = 20
): Promise<{ items: TBlogSchemaDto[]; totalItems: number }> {
  try {
    const repo = new BlogRepository(documentsClient);
    const result = await repo.getPublishedBlogs(page, limit);
    const items = result.items.filter((post) => isIndexablePublishedBlogSlug(post.slug));
    return {
      items,
      totalItems: result.totalItems,
    };
  } catch (error) {
    console.error("Failed to read published blog posts:", error);
    return { items: [], totalItems: 0 };
  }
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<TBlogSchemaDto | null> {
  try {
    const repo = new BlogRepository(documentsClient);
    return await repo.findPublishedBySlug(slug);
  } catch (error) {
    console.error("Failed to read published blog post by slug:", error);
    return null;
  }
}

export async function getRelatedPublishedPosts(
  currentId: string,
  categories: string[],
  tags: string[],
  limit: number = 3
): Promise<TBlogSchemaDto[]> {
  try {
    const repo = new BlogRepository(documentsClient);
    const posts = await repo.findRelatedPublishedBlogs(currentId, categories, tags, limit + 3);
    return posts.filter((post) => isIndexablePublishedBlogSlug(post.slug)).slice(0, limit);
  } catch (error) {
    console.error("Failed to read related published blog posts:", error);
    return [];
  }
}

export const getPublishedBlogSlugs = cache(
  async (): Promise<Array<{ slug: string; updatedAt: Date; canonicalUrl?: string }>> => {
    try {
      const repo = new BlogRepository(documentsClient);
      const posts = await repo.getPublishedSlugs();
      return posts.filter((post) => isIndexablePublishedBlogSlug(post.slug));
    } catch (error) {
      console.error("Failed to read published blog slugs:", error);
      return [];
    }
  }
);
