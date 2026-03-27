import mongoClient from "@/lib/mongodb";
import { ensureCmsAdmin } from "@/lib/cms/ensure-admin";
import {
  ProfessionPageAccentSchema,
  ProfessionPageIconSchema,
} from "@/models/profession-page.model";
import { BlogTargetKeywordRepository } from "@/repositories/blog-target-keyword.repo";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeProfessionSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const SYSTEM_PROMPT = `You are an expert CELPIP instructor and SEO writer for CELPIP Practice Test (celpippracticetest.com).
Output a single JSON object that fills the CMS form for a marketing "profession" landing page.
Output ONLY valid JSON. No markdown, no code fences, no explanation.

JSON shape (respect string length limits strictly):
{
  "slug": "string, lowercase a-z 0-9 hyphens (e.g. celpip-for-nurses)",
  "metaTitle": "string, max 70 chars, primary keyword near front",
  "metaDescription": "string, max 160 chars, SERP description with CTA",
  "keywords": "string, comma-separated (IRCC, CLB, profession terms)",
  "title": "string, 3-160 chars, H1 prefix e.g. CELPIP for Nurses",
  "badge": "string, short trust line under icon",
  "h1Highlight": "string, second part of H1 e.g. Meet Your Registration Requirements",
  "aiSnippetQuestion": "string, max 200 chars, conversational question for AI search (optional but recommended)",
  "aiSnippet": "string, max 400 characters, ~50-60 words (45-78 words), position-zero direct answer: CELPIP, CLB, IRCC context",
  "intro": "string, max 320 chars, promotional hook after position-zero",
  "sectionTitle": "string",
  "sectionSubtitle": "string",
  "card1Title": "string",
  "card1Desc": "string",
  "card1Challenge": "string",
  "card1Solution": "string",
  "chooseUsTitle": "string",
  "chooseUsSubtitle": "string",
  "faq": [ { "question": "string, max 300, conversational voice-search", "answer": "string, max 1200, concise" } ],
  "ctaTitle": "string",
  "accent": "one of: blue teal amber emerald rose cyan indigo violet slate",
  "icon": "one of: Briefcase Truck Heart Wrench Smile Rocket Users Baby Cpu MedicalServices Medication Policy Apartment School Science Mic",
  "relatedArticles": [ { "title": "string", "url": "string path starting with /" } ] optional, 0-4 items,
  "relatedProfessions": [ { "title": "string", "url": "string /slug-here" } ] optional, 0-4 items
}

Rules: ESL-friendly tone (tutor talking to a student). Short sentences. Include semantic terms (IRCC, CLB, Paragon, registration/licensing). Position-zero aiSnippet must directly answer the main query. Include 4–6 FAQ objects (not separate faq1Q keys). FAQ questions should sound like real voice search. Related URLs must be plausible on-site paths.`;

export async function POST(req: NextRequest) {
  try {
    const admin = await ensureCmsAdmin();
    if (!admin.ok) return admin.response;

    const body = await req.json().catch(() => ({}));
    const prompt =
      typeof body.prompt === "string" && body.prompt.trim()
        ? body.prompt.trim()
        : null;
    const titleHint =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : undefined;

    if (!prompt) {
      return NextResponse.json({ message: "Prompt is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not set.");
      return NextResponse.json(
        { message: "AI service is not configured." },
        { status: 503 }
      );
    }

    let targetPhrases: string[] = [];
    try {
      const kwRepo = new BlogTargetKeywordRepository(mongoClient);
      targetPhrases = await kwRepo.listActivePhrases();
    } catch (e) {
      console.warn("Profession generate-content: could not load target keywords", e);
    }

    const keywordsBlock =
      targetPhrases.length > 0
        ? `\n\nSite-wide SEO target keywords from CMS (use each at least once naturally in aiSnippet, intro, or body fields where appropriate; include all in the comma-separated "keywords" field):\n${targetPhrases.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
        : "";

    const userMessage = titleHint
      ? `Optional context — current title: ${titleHint}\n\nGenerate the full profession page JSON for:\n\n${prompt}${keywordsBlock}`
      : `Generate the full profession page JSON for:\n\n${prompt}${keywordsBlock}`;

    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://celpippracticetest.com",
          "X-Title": "CELPIP Practice Test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          max_tokens: 4096,
        }),
      }
    );

    if (!openRouterResponse.ok) {
      const err = await openRouterResponse.text();
      console.error("OpenRouter error:", openRouterResponse.status, err);
      return NextResponse.json(
        { message: "AI request failed. Try again." },
        { status: 502 }
      );
    }

    const data = await openRouterResponse.json();
    let raw: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!raw) {
      return NextResponse.json(
        { message: "AI returned no content." },
        { status: 502 }
      );
    }

    if (raw.startsWith("```")) {
      raw = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error("Profession generate-content: invalid JSON", raw.slice(0, 200));
      return NextResponse.json(
        { message: "AI returned invalid JSON." },
        { status: 502 }
      );
    }

    const slug = normalizeProfessionSlug(
      typeof parsed.slug === "string" ? parsed.slug : ""
    );

    const accentRaw = typeof parsed.accent === "string" ? parsed.accent.trim() : "";
    const iconRaw = typeof parsed.icon === "string" ? parsed.icon.trim() : "";
    const accentParsed = ProfessionPageAccentSchema.safeParse(accentRaw);
    const iconParsed = ProfessionPageIconSchema.safeParse(iconRaw);
    const accent = accentParsed.success ? accentParsed.data : "blue";
    const icon = iconParsed.success ? iconParsed.data : "Briefcase";

    function faqFromParsed(p: Record<string, unknown>): { question: string; answer: string }[] {
      if (Array.isArray(p.faq)) {
        const rows = p.faq
          .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
          .map((x) => ({
            question: String(x.question ?? "").trim().slice(0, 300),
            answer: String(x.answer ?? "").trim().slice(0, 1200),
          }))
          .filter((x) => x.question && x.answer);
        if (rows.length >= 3) return rows.slice(0, 10);
      }
      const legacy: { question: string; answer: string }[] = [];
      for (let i = 1; i <= 3; i++) {
        const q = p[`faq${i}Q` as keyof typeof p];
        const a = p[`faq${i}A` as keyof typeof p];
        const qs = typeof q === "string" ? q.trim().slice(0, 300) : "";
        const as = typeof a === "string" ? a.trim().slice(0, 1200) : "";
        if (qs && as) legacy.push({ question: qs, answer: as });
      }
      return legacy.slice(0, 10);
    }

    const linkItems = (
      key: "relatedArticles" | "relatedProfessions"
    ): { title: string; url: string }[] => {
      const arr = parsed[key];
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
        .map((x) => ({
          title: String(x.title ?? "").trim(),
          url: String(x.url ?? "").trim(),
        }))
        .filter((x) => x.title && x.url);
    };

    const keywordsInput =
      typeof parsed.keywords === "string"
        ? parsed.keywords.trim()
        : Array.isArray(parsed.keywords)
          ? (parsed.keywords as string[]).map((k) => String(k).trim()).filter(Boolean).join(", ")
          : "";

    const payload = {
      slug: slug || "profession",
      metaTitle:
        typeof parsed.metaTitle === "string"
          ? parsed.metaTitle.trim().slice(0, 70)
          : "",
      metaDescription:
        typeof parsed.metaDescription === "string"
          ? parsed.metaDescription.trim().slice(0, 160)
          : "",
      keywordsInput,
      title:
        typeof parsed.title === "string" ? parsed.title.trim().slice(0, 160) : "",
      badge: typeof parsed.badge === "string" ? parsed.badge.trim() : "",
      h1Highlight:
        typeof parsed.h1Highlight === "string" ? parsed.h1Highlight.trim() : "",
      aiSnippetQuestion:
        typeof parsed.aiSnippetQuestion === "string"
          ? parsed.aiSnippetQuestion.trim().slice(0, 200)
          : "",
      aiSnippet:
        typeof parsed.aiSnippet === "string"
          ? parsed.aiSnippet.trim().slice(0, 400)
          : "",
      intro:
        typeof parsed.intro === "string" ? parsed.intro.trim().slice(0, 320) : "",
      sectionTitle:
        typeof parsed.sectionTitle === "string" ? parsed.sectionTitle.trim() : "",
      sectionSubtitle:
        typeof parsed.sectionSubtitle === "string"
          ? parsed.sectionSubtitle.trim()
          : "",
      card1Title:
        typeof parsed.card1Title === "string" ? parsed.card1Title.trim() : "",
      card1Desc:
        typeof parsed.card1Desc === "string" ? parsed.card1Desc.trim() : "",
      card1Challenge:
        typeof parsed.card1Challenge === "string"
          ? parsed.card1Challenge.trim()
          : "",
      card1Solution:
        typeof parsed.card1Solution === "string"
          ? parsed.card1Solution.trim()
          : "",
      chooseUsTitle:
        typeof parsed.chooseUsTitle === "string"
          ? parsed.chooseUsTitle.trim()
          : "",
      chooseUsSubtitle:
        typeof parsed.chooseUsSubtitle === "string"
          ? parsed.chooseUsSubtitle.trim()
          : "",
      faq: faqFromParsed(parsed),
      ctaTitle:
        typeof parsed.ctaTitle === "string" ? parsed.ctaTitle.trim() : "",
      accent,
      icon,
      relatedArticles: linkItems("relatedArticles"),
      relatedProfessions: linkItems("relatedProfessions"),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Profession generate-content error:", error);
    return NextResponse.json(
      { message: "Failed to generate content." },
      { status: 500 }
    );
  }
}
