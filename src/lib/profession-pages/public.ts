import type { ProfessionPageConfig } from "@/components/pages/marketing/ProfessionPageTemplate";
import mongoClient from "@/lib/mongodb";
import { TProfessionPageContent } from "@/models/profession-page.model";
import {
  ProfessionPageRepository,
  type ProfessionPageSummary,
} from "@/repositories/profession-page.repo";

export function professionPageToTemplateConfig(doc: TProfessionPageContent): ProfessionPageConfig {
  return {
    slug: doc.slug,
    title: doc.title,
    badge: doc.badge,
    h1Highlight: doc.h1Highlight,
    aiSnippetQuestion: doc.aiSnippetQuestion,
    aiSnippet: doc.aiSnippet,
    intro: doc.intro,
    sectionTitle: doc.sectionTitle,
    sectionSubtitle: doc.sectionSubtitle,
    card1Title: doc.card1Title,
    card1Desc: doc.card1Desc,
    card1Challenge: doc.card1Challenge,
    card1Solution: doc.card1Solution,
    chooseUsTitle: doc.chooseUsTitle,
    chooseUsSubtitle: doc.chooseUsSubtitle,
    faq: doc.faq,
    ctaTitle: doc.ctaTitle,
    accent: doc.accent,
    icon: doc.icon,
    relatedArticles: doc.relatedArticles,
    relatedProfessions: doc.relatedProfessions,
  };
}

export async function getPublishedProfessionPageBySlug(
  slug: string
): Promise<TProfessionPageContent | null> {
  try {
    if (!mongoClient) return null;
    const repo = new ProfessionPageRepository(mongoClient);
    return await repo.findPublishedBySlug(slug);
  } catch (error) {
    console.error("Failed to read profession page:", slug, error);
    return null;
  }
}

export async function getPublishedProfessionPageSlugs(): Promise<string[]> {
  try {
    if (!mongoClient) return [];
    const repo = new ProfessionPageRepository(mongoClient);
    return await repo.listPublishedSlugs();
  } catch (error) {
    console.error("Failed to list profession page slugs:", error);
    return [];
  }
}

export async function getPublishedProfessionPages(): Promise<TProfessionPageContent[]> {
  try {
    if (!mongoClient) return [];
    const repo = new ProfessionPageRepository(mongoClient);
    return await repo.listPublished();
  } catch (error) {
    console.error("Failed to list profession pages:", error);
    return [];
  }
}

export async function getPublishedProfessionPageSummaries(): Promise<ProfessionPageSummary[]> {
  try {
    if (!mongoClient) return [];
    const repo = new ProfessionPageRepository(mongoClient);
    return await repo.listPublishedSummaries();
  } catch (error) {
    console.error("Failed to list profession page summaries:", error);
    return [];
  }
}
