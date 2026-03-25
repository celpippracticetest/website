"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import Autorenew from "@mui/icons-material/Autorenew";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { ProfessionPageContentSchema } from "@/models/profession-page.model";
import type { TProfessionPageContent } from "@/models/profession-page.model";

const ACCENTS = [
  "blue",
  "teal",
  "amber",
  "emerald",
  "rose",
  "cyan",
  "indigo",
  "violet",
  "slate",
] as const satisfies readonly TProfessionPageContent["accent"][];

const ICONS = [
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
] as const satisfies readonly TProfessionPageContent["icon"][];

const FAQ_MIN = 3;
const FAQ_MAX = 10;

type FaqFormRow = { question: string; answer: string };

/** CMS form state (strings for optional SEO fields; FAQ as editable rows). */
export type ProfessionPageFormValues = Omit<
  TProfessionPageContent,
  "keywords" | "relatedArticles" | "relatedProfessions" | "faq" | "metaTitle" | "metaDescription" | "aiSnippetQuestion"
> & {
  metaTitle: string;
  metaDescription: string;
  aiSnippetQuestion: string;
  faqItems: FaqFormRow[];
  keywordsText: string;
  relatedArticlesText: string;
  relatedProfessionsText: string;
};

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Keywords field accepts commas and/or newlines (blog-style CSV + line breaks). */
function parseKeywordsText(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function keywordsCsvToMultiline(input: string): string {
  return input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

function linksFromText(raw: string): { title: string; url: string }[] {
  if (!raw.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.indexOf("|");
      if (pipe === -1) return { title: line, url: "" };
      return {
        title: line.slice(0, pipe).trim(),
        url: line.slice(pipe + 1).trim(),
      };
    })
    .filter((x) => x.title && x.url);
}

function linksToText(items: { title: string; url: string }[] | undefined): string {
  if (!items?.length) return "";
  return items.map((x) => `${x.title}|${x.url}`).join("\n");
}

export type ProfessionPageFormSubmitPayload = TProfessionPageContent;

type ProfessionPageFormProps = {
  initialData: TProfessionPageContent | null;
  slugReadOnly: boolean;
  isSubmitting: boolean;
  onSubmit: (data: ProfessionPageFormSubmitPayload) => Promise<void>;
};

function emptyFaqRows(): FaqFormRow[] {
  return Array.from({ length: FAQ_MIN }, () => ({ question: "", answer: "" }));
}

function emptyDefaults(): ProfessionPageFormValues {
  return {
    slug: "",
    published: true,
    metaTitle: "",
    metaDescription: "",
    keywordsText: "",
    title: "",
    badge: "",
    h1Highlight: "",
    aiSnippetQuestion: "",
    aiSnippet: "",
    intro: "",
    sectionTitle: "",
    sectionSubtitle: "",
    card1Title: "",
    card1Desc: "",
    card1Challenge: "",
    card1Solution: "",
    chooseUsTitle: "",
    chooseUsSubtitle: "",
    faqItems: emptyFaqRows(),
    ctaTitle: "",
    accent: "blue",
    icon: "Briefcase",
    relatedArticlesText: "",
    relatedProfessionsText: "",
  };
}

function fromDoc(doc: TProfessionPageContent): ProfessionPageFormValues {
  const {
    keywords,
    relatedArticles,
    relatedProfessions,
    aiSnippetQuestion,
    faq,
    metaTitle,
    metaDescription,
    ...rest
  } = doc;
  return {
    ...rest,
    metaTitle: metaTitle ?? "",
    metaDescription: metaDescription ?? "",
    aiSnippetQuestion: aiSnippetQuestion ?? "",
    faqItems: faq.map((x) => ({ question: x.question, answer: x.answer })),
    keywordsText: (keywords ?? []).join("\n"),
    relatedArticlesText: linksToText(relatedArticles),
    relatedProfessionsText: linksToText(relatedProfessions),
  };
}

export default function ProfessionPageForm({
  initialData,
  slugReadOnly,
  isSubmitting,
  onSubmit,
}: ProfessionPageFormProps) {
  const [values, setValues] = useState<ProfessionPageFormValues>(() =>
    initialData ? fromDoc(initialData) : emptyDefaults()
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [seoAdvicePrompt, setSeoAdvicePrompt] = useState("");
  const [isApplyingSeoFixes, setIsApplyingSeoFixes] = useState(false);

  useEffect(() => {
    if (initialData) {
      setValues(fromDoc(initialData));
    }
  }, [initialData]);

  const aiWordCount = useMemo(() => countWords(values.aiSnippet), [values.aiSnippet]);

  const set =
    (key: Exclude<keyof ProfessionPageFormValues, "faqItems">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      setValues((prev) => ({ ...prev, [key]: v }));
    };

  const updateFaqRow = (index: number, key: keyof FaqFormRow, value: string) => {
    setValues((prev) => {
      const next = [...prev.faqItems];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, faqItems: next };
    });
  };

  const addFaqRow = () => {
    setValues((prev) => {
      if (prev.faqItems.length >= FAQ_MAX) return prev;
      return { ...prev, faqItems: [...prev.faqItems, { question: "", answer: "" }] };
    });
  };

  const removeFaqRow = (index: number) => {
    setValues((prev) => {
      if (prev.faqItems.length <= FAQ_MIN) return prev;
      return { ...prev, faqItems: prev.faqItems.filter((_, i) => i !== index) };
    });
  };

  const handleGenerateWithAi = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast({
        title: "Prompt required",
        description: "Enter a topic or outline for the profession page.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("/api/admin/profession-pages/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          title: values.title.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to generate content.");
      }

      setValues((prev) => {
        const next = { ...prev };
        if (typeof data.slug === "string" && !slugReadOnly) {
          next.slug = String(data.slug).trim();
        }
        if (data.metaTitle != null) next.metaTitle = String(data.metaTitle);
        if (data.metaDescription != null) next.metaDescription = String(data.metaDescription);
        if (data.keywordsInput != null) {
          next.keywordsText = keywordsCsvToMultiline(String(data.keywordsInput));
        }
        if (data.title != null) next.title = String(data.title);
        if (data.badge != null) next.badge = String(data.badge);
        if (data.h1Highlight != null) next.h1Highlight = String(data.h1Highlight);
        if (data.aiSnippetQuestion != null) {
          next.aiSnippetQuestion = String(data.aiSnippetQuestion).trim().slice(0, 200);
        }
        if (data.aiSnippet != null) next.aiSnippet = String(data.aiSnippet).trim().slice(0, 400);
        if (data.intro != null) next.intro = String(data.intro).trim().slice(0, 320);
        if (data.sectionTitle != null) next.sectionTitle = String(data.sectionTitle);
        if (data.sectionSubtitle != null) next.sectionSubtitle = String(data.sectionSubtitle);
        if (data.card1Title != null) next.card1Title = String(data.card1Title);
        if (data.card1Desc != null) next.card1Desc = String(data.card1Desc);
        if (data.card1Challenge != null) next.card1Challenge = String(data.card1Challenge);
        if (data.card1Solution != null) next.card1Solution = String(data.card1Solution);
        if (data.chooseUsTitle != null) next.chooseUsTitle = String(data.chooseUsTitle);
        if (data.chooseUsSubtitle != null) next.chooseUsSubtitle = String(data.chooseUsSubtitle);
        if (Array.isArray(data.faq) && data.faq.length >= FAQ_MIN) {
          const rows = data.faq
            .slice(0, FAQ_MAX)
            .map((row: { question?: string; answer?: string }) => ({
              question: String(row?.question ?? "").trim().slice(0, 300),
              answer: String(row?.answer ?? "").trim().slice(0, 1200),
            }))
            .filter((row: FaqFormRow) => row.question && row.answer);
          if (rows.length >= FAQ_MIN) next.faqItems = rows;
        }
        if (data.ctaTitle != null) next.ctaTitle = String(data.ctaTitle);
        if (data.accent && (ACCENTS as readonly string[]).includes(data.accent)) {
          next.accent = data.accent as TProfessionPageContent["accent"];
        }
        if (data.icon && (ICONS as readonly string[]).includes(data.icon)) {
          next.icon = data.icon as TProfessionPageContent["icon"];
        }
        if (Array.isArray(data.relatedArticles) && data.relatedArticles.length > 0) {
          const lines = data.relatedArticles
            .filter(
              (x: { title?: string; url?: string }) =>
                String(x?.title ?? "").trim() && String(x?.url ?? "").trim()
            )
            .map(
              (x: { title?: string; url?: string }) =>
                `${String(x.title).trim()}|${String(x.url).trim()}`
            );
          if (lines.length) next.relatedArticlesText = lines.join("\n");
        }
        if (Array.isArray(data.relatedProfessions) && data.relatedProfessions.length > 0) {
          const lines = data.relatedProfessions
            .filter(
              (x: { title?: string; url?: string }) =>
                String(x?.title ?? "").trim() && String(x?.url ?? "").trim()
            )
            .map(
              (x: { title?: string; url?: string }) =>
                `${String(x.title).trim()}|${String(x.url).trim()}`
            );
          if (lines.length) next.relatedProfessionsText = lines.join("\n");
        }
        return next;
      });

      toast({
        title: "Form filled with AI",
        description: "Review all fields (slug, aiSnippet word count, FAQs) before saving.",
      });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySeoFixesWithAi = async () => {
    const advice = seoAdvicePrompt.trim();
    if (!advice) {
      toast({
        title: "SEO advice required",
        description: "Describe what to improve (keywords, meta, intro, position-zero block, FAQs, etc.).",
        variant: "destructive",
      });
      return;
    }
    setIsApplyingSeoFixes(true);
    try {
      const response = await fetch("/api/admin/profession-pages/apply-seo-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advice,
          current: {
            title: values.title,
            h1Highlight: values.h1Highlight,
            badge: values.badge,
            metaTitle: values.metaTitle,
            metaDescription: values.metaDescription,
            keywordsInput: parseKeywordsText(values.keywordsText).join(", "),
            aiSnippetQuestion: values.aiSnippetQuestion,
            aiSnippet: values.aiSnippet,
            intro: values.intro,
            sectionTitle: values.sectionTitle,
            sectionSubtitle: values.sectionSubtitle,
            card1Title: values.card1Title,
            card1Desc: values.card1Desc,
            card1Challenge: values.card1Challenge,
            card1Solution: values.card1Solution,
            chooseUsTitle: values.chooseUsTitle,
            chooseUsSubtitle: values.chooseUsSubtitle,
            faq: values.faqItems
              .map((x) => ({
                question: x.question.trim(),
                answer: x.answer.trim(),
              }))
              .filter((x) => x.question && x.answer),
            ctaTitle: values.ctaTitle,
            accent: values.accent,
            icon: values.icon,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to apply SEO fixes.");
      }

      setValues((prev) => ({
        ...prev,
        title: typeof data.title === "string" ? data.title : prev.title,
        h1Highlight: typeof data.h1Highlight === "string" ? data.h1Highlight : prev.h1Highlight,
        badge: typeof data.badge === "string" ? data.badge : prev.badge,
        metaTitle: typeof data.metaTitle === "string" ? data.metaTitle : prev.metaTitle,
        metaDescription: typeof data.metaDescription === "string" ? data.metaDescription : prev.metaDescription,
        keywordsText:
          typeof data.keywordsInput === "string"
            ? keywordsCsvToMultiline(data.keywordsInput)
            : prev.keywordsText,
        aiSnippetQuestion:
          typeof data.aiSnippetQuestion === "string" ? data.aiSnippetQuestion : prev.aiSnippetQuestion,
        aiSnippet:
          typeof data.aiSnippet === "string" ? data.aiSnippet.slice(0, 400) : prev.aiSnippet,
        intro: typeof data.intro === "string" ? data.intro.slice(0, 320) : prev.intro,
        sectionTitle: typeof data.sectionTitle === "string" ? data.sectionTitle : prev.sectionTitle,
        sectionSubtitle: typeof data.sectionSubtitle === "string" ? data.sectionSubtitle : prev.sectionSubtitle,
        card1Title: typeof data.card1Title === "string" ? data.card1Title : prev.card1Title,
        card1Desc: typeof data.card1Desc === "string" ? data.card1Desc : prev.card1Desc,
        card1Challenge: typeof data.card1Challenge === "string" ? data.card1Challenge : prev.card1Challenge,
        card1Solution: typeof data.card1Solution === "string" ? data.card1Solution : prev.card1Solution,
        chooseUsTitle: typeof data.chooseUsTitle === "string" ? data.chooseUsTitle : prev.chooseUsTitle,
        chooseUsSubtitle: typeof data.chooseUsSubtitle === "string" ? data.chooseUsSubtitle : prev.chooseUsSubtitle,
        faqItems: (() => {
          if (!Array.isArray(data.faq)) return prev.faqItems;
          const rows = (data.faq as { question?: string; answer?: string }[])
            .slice(0, FAQ_MAX)
            .map((row) => ({
              question: String(row?.question ?? "").trim().slice(0, 300),
              answer: String(row?.answer ?? "").trim().slice(0, 1200),
            }))
            .filter((row) => row.question && row.answer);
          return rows.length >= FAQ_MIN ? rows : prev.faqItems;
        })(),
        ctaTitle: typeof data.ctaTitle === "string" ? data.ctaTitle : prev.ctaTitle,
        accent:
          typeof data.accent === "string" && (ACCENTS as readonly string[]).includes(data.accent)
            ? (data.accent as TProfessionPageContent["accent"])
            : prev.accent,
        icon:
          typeof data.icon === "string" && (ICONS as readonly string[]).includes(data.icon)
            ? (data.icon as TProfessionPageContent["icon"])
            : prev.icon,
      }));

      toast({
        title: "AI SEO fixes applied",
        description: "Review title, meta, keywords, and on-page copy before saving.",
      });
    } catch (err) {
      toast({
        title: "SEO fixes failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingSeoFixes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const keywords = parseKeywordsText(values.keywordsText);
    const relatedArticles = linksFromText(values.relatedArticlesText);
    const relatedProfessions = linksFromText(values.relatedProfessionsText);

    const faq = values.faqItems
      .map((x) => ({ question: x.question.trim(), answer: x.answer.trim() }))
      .filter((x) => x.question && x.answer);
    if (faq.length < FAQ_MIN) {
      setFormError(`Add at least ${FAQ_MIN} complete FAQ items (question and answer).`);
      return;
    }
    if (faq.length > FAQ_MAX) {
      setFormError(`At most ${FAQ_MAX} FAQ items.`);
      return;
    }

    const payload = {
      slug: values.slug.trim(),
      published: values.published,
      metaTitle: values.metaTitle.trim() || undefined,
      metaDescription: values.metaDescription.trim() || undefined,
      keywords,
      title: values.title.trim(),
      badge: values.badge.trim(),
      h1Highlight: values.h1Highlight.trim(),
      aiSnippetQuestion: values.aiSnippetQuestion.trim() || undefined,
      aiSnippet: values.aiSnippet.trim(),
      intro: values.intro.trim(),
      sectionTitle: values.sectionTitle.trim(),
      sectionSubtitle: values.sectionSubtitle.trim(),
      card1Title: values.card1Title.trim(),
      card1Desc: values.card1Desc.trim(),
      card1Challenge: values.card1Challenge.trim(),
      card1Solution: values.card1Solution.trim(),
      chooseUsTitle: values.chooseUsTitle.trim(),
      chooseUsSubtitle: values.chooseUsSubtitle.trim(),
      faq,
      ctaTitle: values.ctaTitle.trim(),
      accent: values.accent,
      icon: values.icon,
      relatedArticles: relatedArticles.length ? relatedArticles : undefined,
      relatedProfessions: relatedProfessions.length ? relatedProfessions : undefined,
    };

    const parsed = ProfessionPageContentSchema.safeParse(payload);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((x) => x.message).join(" ");
      setFormError(msg || "Validation failed.");
      return;
    }

    await onSubmit(parsed.data);
  };

  const section = (title: string, children: React.ReactNode) => (
    <Box className="mb-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Typography variant="subtitle1" className="mb-4 font-semibold text-slate-900">
        {title}
      </Typography>
      <Box className="flex flex-col gap-3">{children}</Box>
    </Box>
  );

  return (
    <form onSubmit={handleSubmit}>
      {formError ? (
        <Box className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formError}
        </Box>
      ) : null}

      <Box className="mb-8 rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
        <Typography variant="subtitle1" className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
          <AutoAwesome className="text-amber-500" fontSize="small" />
          Fill entire form with AI
        </Typography>
        <Typography variant="body2" className="mb-3 text-slate-600">
          Describe the profession or pathway (e.g. &quot;Mortgage brokers in Ontario needing CLB 7 for FSRA&quot;). AI fills
          slug, SEO, hero, main section, FAQs, CTA, accent, icon, and optional related links. Site-wide blog target keywords
          from the CMS are included when available. Optional: set Title (H1 prefix) first for extra context.
        </Typography>
        <Box className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            label="AI prompt"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            disabled={isGenerating}
            fullWidth
            multiline
            minRows={3}
            size="small"
            placeholder="e.g. Landing page for veterinarians registering in Canada — CELPIP Level 7, provincial college language rules"
          />
          <Button type="button" variant="secondary" disabled={isGenerating} onClick={() => void handleGenerateWithAi()}>
            {isGenerating ? (
              <>
                <Autorenew className="mr-2 h-4 w-4 animate-spin" />
                Filling…
              </>
            ) : (
              <>
                <AutoAwesome className="mr-2 h-4 w-4" />
                Fill form with AI
              </>
            )}
          </Button>
        </Box>
      </Box>

      {section(
        "URL & status",
        <>
          <TextField
            required
            label="Slug"
            value={values.slug}
            onChange={set("slug")}
            disabled={slugReadOnly}
            fullWidth
            size="small"
            helperText='Must match pattern celpip-for-… (e.g. celpip-for-nurses). Slug cannot be changed after create.'
          />
          <FormControlLabel
            control={
              <Switch
                checked={values.published}
                onChange={(_, checked) => setValues((p) => ({ ...p, published: checked }))}
              />
            }
            label="Published (visible on the marketing site)"
          />
        </>
      )}

      {section(
        "SEO",
        <>
          <TextField
            label="Meta title"
            value={values.metaTitle}
            onChange={set("metaTitle")}
            fullWidth
            size="small"
            inputProps={{ maxLength: 70 }}
            helperText={`${values.metaTitle.length}/70 — primary keyword near the front`}
          />
          <TextField
            label="Meta description"
            value={values.metaDescription}
            onChange={set("metaDescription")}
            fullWidth
            size="small"
            multiline
            minRows={2}
            inputProps={{ maxLength: 160 }}
            helperText={`${values.metaDescription.length}/160 — end with a CTA when possible`}
          />
          <TextField
            label="Keywords (comma and/or one per line)"
            value={values.keywordsText}
            onChange={set("keywordsText")}
            fullWidth
            size="small"
            multiline
            minRows={3}
            helperText="e.g. IRCC, CLB, profession-specific terms (same idea as blog keywords field)."
          />
        </>
      )}

      {section(
        "Hero",
        <>
          <TextField required label="Title (H1 prefix)" value={values.title} onChange={set("title")} fullWidth size="small" />
          <TextField required label="Badge" value={values.badge} onChange={set("badge")} fullWidth size="small" />
          <TextField
            required
            label="H1 highlight"
            value={values.h1Highlight}
            onChange={set("h1Highlight")}
            fullWidth
            size="small"
          />
          <TextField
            label="AI snippet question (optional)"
            value={values.aiSnippetQuestion}
            onChange={set("aiSnippetQuestion")}
            fullWidth
            size="small"
            inputProps={{ maxLength: 200 }}
            helperText={`${values.aiSnippetQuestion.length}/200 — conversational question for AI search (blog aiSnippet.question)`}
          />
          <TextField
            required
            label={`Position-zero answer (${aiWordCount} words, target ~50–60, allowed 45–78)`}
            value={values.aiSnippet}
            onChange={set("aiSnippet")}
            fullWidth
            size="small"
            multiline
            minRows={4}
            inputProps={{ maxLength: 400 }}
            helperText={`${values.aiSnippet.length}/400 characters — direct answer under H1 (blog aiSnippet.answer)`}
          />
          <TextField
            required
            label="Intro (promotional)"
            value={values.intro}
            onChange={set("intro")}
            fullWidth
            size="small"
            multiline
            minRows={3}
            inputProps={{ maxLength: 320 }}
            helperText={`${values.intro.length}/320 — hook after position-zero (blog excerpt style)`}
          />
          <TextField
            select
            label="Accent"
            value={values.accent}
            onChange={(e) =>
              setValues((p) => ({ ...p, accent: e.target.value as TProfessionPageContent["accent"] }))
            }
            fullWidth
            size="small"
          >
            {ACCENTS.map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Icon"
            value={values.icon}
            onChange={(e) =>
              setValues((p) => ({ ...p, icon: e.target.value as TProfessionPageContent["icon"] }))
            }
            fullWidth
            size="small"
          >
            {ICONS.map((i) => (
              <MenuItem key={i} value={i}>
                {i}
              </MenuItem>
            ))}
          </TextField>
        </>
      )}

      {section(
        "Main section",
        <>
          <TextField required label="Section title" value={values.sectionTitle} onChange={set("sectionTitle")} fullWidth size="small" />
          <TextField
            required
            label="Section subtitle"
            value={values.sectionSubtitle}
            onChange={set("sectionSubtitle")}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />
          <TextField required label="Card 1 title" value={values.card1Title} onChange={set("card1Title")} fullWidth size="small" />
          <TextField required label="Card 1 description" value={values.card1Desc} onChange={set("card1Desc")} fullWidth size="small" />
          <TextField
            required
            label="Card 1 challenge"
            value={values.card1Challenge}
            onChange={set("card1Challenge")}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />
          <TextField
            required
            label="Card 1 solution"
            value={values.card1Solution}
            onChange={set("card1Solution")}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />
          <TextField required label="Choose us title" value={values.chooseUsTitle} onChange={set("chooseUsTitle")} fullWidth size="small" />
          <TextField
            required
            label="Choose us subtitle"
            value={values.chooseUsSubtitle}
            onChange={set("chooseUsSubtitle")}
            fullWidth
            size="small"
          />
        </>
      )}

      {section(
        "FAQ",
        <>
          <Typography variant="body2" className="text-slate-600">
            Add {FAQ_MIN}–{FAQ_MAX} voice-search style questions. Used in the on-page accordion and FAQPage JSON-LD.
          </Typography>
          {values.faqItems.map((row, i) => (
            <Box
              key={i}
              className="rounded-lg border border-slate-200 bg-slate-50/80 p-3"
            >
              <Box className="mb-2 flex items-center justify-between gap-2">
                <Typography variant="subtitle2" className="font-semibold text-slate-800">
                  FAQ {i + 1}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Remove FAQ"
                  disabled={values.faqItems.length <= FAQ_MIN}
                  onClick={() => removeFaqRow(i)}
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Box>
              <TextField
                required
                label="Question"
                value={row.question}
                onChange={(e) => updateFaqRow(i, "question", e.target.value)}
                fullWidth
                size="small"
                className="mb-2"
                inputProps={{ maxLength: 300 }}
              />
              <TextField
                required
                label="Answer"
                value={row.answer}
                onChange={(e) => updateFaqRow(i, "answer", e.target.value)}
                fullWidth
                size="small"
                multiline
                minRows={3}
                inputProps={{ maxLength: 1200 }}
              />
            </Box>
          ))}
          <Box>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={values.faqItems.length >= FAQ_MAX}
              onClick={addFaqRow}
            >
              <Add className="mr-1 h-4 w-4" />
              Add FAQ
            </Button>
            {values.faqItems.length >= FAQ_MAX ? (
              <Typography variant="caption" className="ml-2 text-slate-500">
                Maximum {FAQ_MAX} items.
              </Typography>
            ) : null}
          </Box>
        </>
      )}

      {section(
        "CTA & related links",
        <>
          <TextField required label="CTA title" value={values.ctaTitle} onChange={set("ctaTitle")} fullWidth size="small" />
          <TextField
            label="Related articles (one per line: Title|/path)"
            value={values.relatedArticlesText}
            onChange={set("relatedArticlesText")}
            fullWidth
            size="small"
            multiline
            minRows={3}
            placeholder={"Speaking guide|/wiki/celpip-speaking-score-guide"}
          />
          <TextField
            label="Related professions (one per line: Title|/path)"
            value={values.relatedProfessionsText}
            onChange={set("relatedProfessionsText")}
            fullWidth
            size="small"
            multiline
            minRows={3}
            placeholder={"Nurses|/celpip-for-nurses"}
          />
        </>
      )}

      <Box className="mb-8 rounded-lg border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
        <Typography variant="subtitle1" className="mb-2 font-semibold text-slate-900">
          AI SEO fixes (patch title / meta / keywords / content)
        </Typography>
        <Typography variant="body2" className="mb-3 text-slate-600">
          Describe changes (e.g. add keyword &quot;CELPIP for nurses&quot; to meta and intro, shorten the position-zero
          block, make FAQs more voice-search). AI returns updated title, badge, H1 highlight, meta, keywords, intro, AI
          snippet question and answer, section copy, FAQs, and CTA.
        </Typography>
        <Box className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            label="SEO advice"
            value={seoAdvicePrompt}
            onChange={(e) => setSeoAdvicePrompt(e.target.value)}
            disabled={isApplyingSeoFixes}
            fullWidth
            multiline
            minRows={3}
            size="small"
            placeholder="e.g. Tighten meta to 155 chars with CTA; weave CLB 7 into card copy and FAQ 1"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isApplyingSeoFixes}
            onClick={() => void handleApplySeoFixesWithAi()}
          >
            {isApplyingSeoFixes ? (
              <>
                <Autorenew className="mr-2 h-4 w-4 animate-spin" />
                Applying…
              </>
            ) : (
              <>
                <AutoAwesome className="mr-2 h-4 w-4 text-amber-600" />
                Apply SEO fixes with AI
              </>
            )}
          </Button>
        </Box>
      </Box>

      <Box className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </Box>
    </form>
  );
}
