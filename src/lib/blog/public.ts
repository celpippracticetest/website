import mongoClient from "@/lib/mongodb";
import { TBlogSchemaDto } from "@/models/blog.model";
import { BlogRepository } from "@/repositories/blog.repo";

export async function getPublishedBlogPosts(
  page: number = 0,
  limit: number = 20
): Promise<{ items: TBlogSchemaDto[]; totalItems: number }> {
  try {
    const repo = new BlogRepository(mongoClient);
    const result = await repo.getPublishedBlogs(page, limit);
    return {
      items: result.items,
      totalItems: result.totalItems,
    };
  } catch (error) {
    console.error("Failed to read published blog posts:", error);
    return { items: [], totalItems: 0 };
  }
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<TBlogSchemaDto | null> {
  try {
    const repo = new BlogRepository(mongoClient);
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
    const repo = new BlogRepository(mongoClient);
    return await repo.findRelatedPublishedBlogs(currentId, categories, tags, limit);
  } catch (error) {
    console.error("Failed to read related published blog posts:", error);
    return [];
  }
}

export async function getPublishedBlogSlugs(): Promise<Array<{ slug: string; updatedAt: Date; canonicalUrl?: string }>> {
  try {
    const repo = new BlogRepository(mongoClient);
    return await repo.getPublishedSlugs();
  } catch (error) {
    console.error("Failed to read published blog slugs:", error);
    return [];
  }
}
