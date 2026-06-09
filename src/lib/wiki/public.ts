import { cache } from "react";
import documentsClient from "@/lib/appDocumentsClient";
import { TWikiArticleSchemaDto } from "@/models/wiki.model";
import { WikiRepository } from "@/repositories/wiki.repo";

export async function getWikiArticleBySlug(
  slug: string
): Promise<TWikiArticleSchemaDto | null> {
  try {
    const repo = new WikiRepository(documentsClient);
    return await repo.findBySlug(slug);
  } catch (error) {
    console.error("Failed to read wiki article by slug:", error);
    return null;
  }
}

export async function getAllWikiArticles(): Promise<TWikiArticleSchemaDto[]> {
  try {
    const repo = new WikiRepository(documentsClient);
    return await repo.findAll();
  } catch (error) {
    console.error("Failed to read wiki articles:", error);
    return [];
  }
}

export const getWikiSlugs = cache(
  async (): Promise<Array<{ slug: string; updatedAt: Date }>> => {
    try {
      const repo = new WikiRepository(documentsClient);
      return await repo.getSlugs();
    } catch (error) {
      console.error("Failed to read wiki slugs:", error);
      return [];
    }
  }
);

export async function getRelatedWikiArticles(
  currentId: string,
  category: string,
  limit: number = 2
): Promise<TWikiArticleSchemaDto[]> {
  try {
    const repo = new WikiRepository(documentsClient);
    return await repo.findRelated(currentId, category, limit);
  } catch (error) {
    console.error("Failed to read related wiki articles:", error);
    return [];
  }
}

export async function getNextWikiArticle(
  slug: string
): Promise<TWikiArticleSchemaDto | null> {
  try {
    const repo = new WikiRepository(documentsClient);
    return await repo.findNextBySlug(slug);
  } catch (error) {
    console.error("Failed to read next wiki article:", error);
    return null;
  }
}
