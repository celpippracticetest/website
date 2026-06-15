import { cache } from "react";
import documentsClient from "@/lib/appDocumentsClient";
import { TBlogSchemaDto } from "@/models/blog.model";
import { BlogRepository } from "@/repositories/blog.repo";

const NON_INDEXABLE_LEGACY_BLOG_SLUGS = new Set([
  "celpip-leauage",
]);

export function isIndexablePublishedBlogSlug(slug: string): boolean {
  return !NON_INDEXABLE_LEGACY_BLOG_SLUGS.has(slug.trim().toLowerCase());
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
      totalItems: items.length,
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
