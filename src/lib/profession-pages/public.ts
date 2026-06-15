import { cache } from "react";
import type { ProfessionPageConfig } from "@/components/pages/marketing/ProfessionPageTemplate";
import documentsClient from "@/lib/appDocumentsClient";
import { TProfessionPageContent } from "@/models/profession-page.model";
import {
  ProfessionPageRepository,
  type ProfessionPageSummary,
} from "@/repositories/profession-page.repo";

const PUBLIC_PROFESSION_DB_TIMEOUT_MS = 500;

export const FALLBACK_PROFESSION_PAGE_SUMMARIES: ProfessionPageSummary[] = [
  { slug: "celpip-for-nurses", title: "CELPIP for Nurses", icon: "stethoscope" },
  { slug: "celpip-for-doctors", title: "CELPIP for Doctors", icon: "user-round-plus" },
  {
    slug: "celpip-for-pharmacists",
    title: "CELPIP for Pharmacists",
    icon: "pill",
  },
  { slug: "celpip-for-dentists", title: "CELPIP for Dentists", icon: "smile" },
  {
    slug: "celpip-for-physiotherapists",
    title: "CELPIP for Physiotherapists",
    icon: "activity",
  },
  { slug: "celpip-for-teachers", title: "CELPIP for Teachers", icon: "graduation-cap" },
  {
    slug: "celpip-for-early-childhood-educators",
    title: "CELPIP for Early Childhood Educators",
    icon: "baby",
  },
  {
    slug: "celpip-for-social-workers",
    title: "CELPIP for Social Workers",
    icon: "heart-handshake",
  },
  { slug: "celpip-for-truck-drivers", title: "CELPIP for Truck Drivers", icon: "truck" },
  { slug: "celpip-for-caregivers", title: "CELPIP for Caregivers", icon: "hand-heart" },
  {
    slug: "celpip-for-real-estate-agents",
    title: "CELPIP for Real Estate Agents",
    icon: "home",
  },
  {
    slug: "celpip-for-accountants",
    title: "CELPIP for Accountants",
    icon: "calculator",
  },
];

async function withPublicProfessionTimeout<T>(
  label: string,
  work: Promise<T>,
  fallback: T
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const guardedWork = work.catch((error) => {
    console.error(label, error);
    return fallback;
  });

  try {
    return await Promise.race([
      guardedWork,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), PUBLIC_PROFESSION_DB_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

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
    if (!documentsClient) return null;
    const repo = new ProfessionPageRepository(documentsClient);
    return await repo.findPublishedBySlug(slug);
  } catch (error) {
    console.error("Failed to read profession page:", slug, error);
    return null;
  }
}

async function getPublishedProfessionPageSlugsUncached(): Promise<string[]> {
  try {
    const fallbackSlugs = FALLBACK_PROFESSION_PAGE_SUMMARIES.map((page) => page.slug);
    if (!documentsClient) return fallbackSlugs;
    const repo = new ProfessionPageRepository(documentsClient);
    return await withPublicProfessionTimeout(
      "Failed to list profession page slugs:",
      repo.listPublishedSlugs(),
      fallbackSlugs
    );
  } catch (error) {
    console.error("Failed to list profession page slugs:", error);
    return FALLBACK_PROFESSION_PAGE_SUMMARIES.map((page) => page.slug);
  }
}

export const getPublishedProfessionPageSlugs = cache(getPublishedProfessionPageSlugsUncached);

export const getPublishedProfessionPageSummaries = cache(
  async (): Promise<ProfessionPageSummary[]> => {
    try {
      if (!documentsClient) return FALLBACK_PROFESSION_PAGE_SUMMARIES;
      const repo = new ProfessionPageRepository(documentsClient);
      return await withPublicProfessionTimeout(
        "Failed to list profession page summaries:",
        repo.listPublishedSummaries(),
        FALLBACK_PROFESSION_PAGE_SUMMARIES
      );
    } catch (error) {
      console.error("Failed to list profession page summaries:", error);
      return FALLBACK_PROFESSION_PAGE_SUMMARIES;
    }
  }
);

export async function getPublishedProfessionPages(): Promise<TProfessionPageContent[]> {
  try {
    if (!documentsClient) return [];
    const repo = new ProfessionPageRepository(documentsClient);
    return await repo.listPublished();
  } catch (error) {
    console.error("Failed to list profession pages:", error);
    return [];
  }
}
