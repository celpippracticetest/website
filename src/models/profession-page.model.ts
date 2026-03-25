import { z } from "zod";

export const ProfessionPageAccentSchema = z.enum([
  "blue",
  "teal",
  "amber",
  "emerald",
  "rose",
  "cyan",
  "indigo",
  "violet",
  "slate",
]);

export const ProfessionPageIconSchema = z.enum([
  "Briefcase",
  "Truck",
  "Heart",
  "Wrench",
  "Smile",
  "Rocket",
  "Users",
  "Baby",
  "Cpu",
  "MedicalServices",
  "Medication",
  "Policy",
  "Apartment",
  "School",
  "Science",
  "Mic",
]);

const LinkItemSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().trim().min(1),
});

/** One FAQ pair for profession landing pages (voice-search style questions). */
export const ProfessionPageFaqItemSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(1200),
});

export type TProfessionPageFaqItem = z.infer<typeof ProfessionPageFaqItemSchema>;

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Merge legacy faq1Q/A … fields or normalize raw faq[] before validation. */
export function normalizeProfessionPageInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const d = { ...(raw as Record<string, unknown>) };
  let faq: unknown[] = [];

  if (Array.isArray(d.faq) && d.faq.length > 0) {
    faq = d.faq;
  } else {
    const legacy: [unknown, unknown][] = [
      [d.faq1Q, d.faq1A],
      [d.faq2Q, d.faq2A],
      [d.faq3Q, d.faq3A],
    ];
    for (const [q, a] of legacy) {
      const qs = typeof q === "string" ? q.trim() : "";
      const as = typeof a === "string" ? a.trim() : "";
      if (qs && as) {
        faq.push({ question: qs, answer: as });
      }
    }
  }

  d.faq = faq;
  delete d.faq1Q;
  delete d.faq1A;
  delete d.faq2Q;
  delete d.faq2A;
  delete d.faq3Q;
  delete d.faq3A;
  return d;
}

const ProfessionPageContentBaseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^celpip-for-[a-z0-9-]+$/, "Slug must start with celpip-for-"),
  published: z.boolean().default(true),
  /** SEO title; primary keyword near the front (blog spec max 70). */
  metaTitle: z.string().trim().min(1).max(70).optional(),
  /** SERP description; end with a CTA when possible (blog spec max 160). */
  metaDescription: z.string().trim().min(1).max(160).optional(),
  /** Semantic terms e.g. IRCC, CLB (comma-separated in CMS, stored as array). */
  keywords: z.array(z.string().trim().min(1)).default([]),
  /** H1 prefix; compelling, voice-search friendly (blog title rules: 3–160 chars). */
  title: z.string().trim().min(3).max(160),
  badge: z.string().trim().min(1),
  h1Highlight: z.string().trim().min(1),
  /**
   * Conversational question for AI search (Perplexity, Gemini, etc.).
   * Optional; pairs with aiSnippet answer (blog aiSnippet.question).
   */
  aiSnippetQuestion: z.string().trim().min(1).max(200).optional(),
  /**
   * Position-zero answer under H1 (blog aiSnippet.answer: ~50–60 words, max 400 chars).
   */
  aiSnippet: z
    .string()
    .trim()
    .min(1)
    .max(400, "aiSnippet must be at most 400 characters (blog generator spec).")
    .refine(
      (s) => countWords(s) >= 45 && countWords(s) <= 78,
      "aiSnippet should be about 50–60 words (45–78 allowed)."
    ),
  /** Hook after position-zero block (like blog excerpt; max 320). */
  intro: z.string().trim().min(1).max(320),
  sectionTitle: z.string().trim().min(1),
  sectionSubtitle: z.string().trim().min(1),
  card1Title: z.string().trim().min(1),
  card1Desc: z.string().trim().min(1),
  card1Challenge: z.string().trim().min(1),
  card1Solution: z.string().trim().min(1),
  chooseUsTitle: z.string().trim().min(1),
  chooseUsSubtitle: z.string().trim().min(1),
  /** 3–10 voice-search style Q&As (FAQPage schema + on-page accordion). */
  faq: z
    .array(ProfessionPageFaqItemSchema)
    .min(3, "Add at least three FAQ items.")
    .max(10, "At most ten FAQ items."),
  ctaTitle: z.string().trim().min(1),
  accent: ProfessionPageAccentSchema,
  icon: ProfessionPageIconSchema,
  relatedArticles: z.array(LinkItemSchema).optional(),
  relatedProfessions: z.array(LinkItemSchema).optional(),
});

export const ProfessionPageContentSchema = z.preprocess(
  normalizeProfessionPageInput,
  ProfessionPageContentBaseSchema
);

export type TProfessionPageContent = z.infer<typeof ProfessionPageContentBaseSchema>;
