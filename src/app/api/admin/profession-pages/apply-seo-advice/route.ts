import { ensureCmsAdmin } from "@/lib/cms/ensure-admin";
import {
  ProfessionPageAccentSchema,
  ProfessionPageIconSchema,
} from "@/models/profession-page.model";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an expert, certified CELPIP instructor and SEO editor for CELPIP Practice Test (celpippracticetest.com). Your audience is ESL test-takers preparing for CELPIP for Canadian PR, citizenship, or professional licensing.
You receive current profession landing page fields and "SEO advice" instructions. Update only what is needed to satisfy the advice.
Output a single JSON object. Include every key listed below so the client can merge (reuse current values verbatim where nothing should change).

Output ONLY valid JSON. No markdown, no code fences, no explanation.

JSON schema (all string lengths are hard limits; stay under them):
{
  "title": "string, 3-160 chars, compelling conversational H1 prefix targeting long-tail / voice search",
  "h1Highlight": "string, second line of H1, clear benefit or outcome",
  "badge": "string, short trust line",
  "metaTitle": "string, max 70, SEO title with primary keyword near the front",
  "metaDescription": "string, max 160, compelling SERP description ending with a call to action",
  "keywordsInput": "string, comma-separated SEO keywords including semantic terms (e.g., IRCC, CLB, Paragon Testing)",
  "aiSnippetQuestion": "string, max 200 or empty — target conversational question for AI search (Perplexity, Gemini, ChatGPT)",
  "aiSnippet": "string, max 400 chars, ~50-60 words — position-zero direct answer (not promotional); plain text only",
  "intro": "string, max 320, hooks the reader after the position-zero block (like blog excerpt)",
  "sectionTitle": "string",
  "sectionSubtitle": "string",
  "card1Title": "string",
  "card1Desc": "string",
  "card1Challenge": "string",
  "card1Solution": "string",
  "chooseUsTitle": "string",
  "chooseUsSubtitle": "string",
  "faq": [ { "question": "string max 300, conversational / voice-search", "answer": "string max 1200, concise" } ],
  "ctaTitle": "string",
  "accent": "blue|teal|amber|emerald|rose|cyan|indigo|violet|slate — change only if advice asks",
  "icon": "Briefcase|Truck|Heart|Wrench|Smile|Rocket|Users|Baby|Cpu|MedicalServices|Medication|Policy|Apartment|School|Science|Mic — change only if advice asks"
}

FAQ rules: The "faq" array must have 3–10 items. Return the full list whenever you change any FAQ. Questions should sound like natural long-tail voice queries.

Editorial rules (align with blog SEO generator):
- ESL readability (crucial): Aim for Flesch reading-ease ~70–85 (about 6th–8th grade). Short sentences, brief idea blocks, simple B1/B2 vocabulary; avoid heavy jargon and generic AI fluff.
- Target keywords: If the user’s advice names keywords or phrases, weave them naturally across metaTitle, metaDescription, keywordsInput, intro, section/card copy, aiSnippet, and FAQ — at least once each where they fit; never keyword-stuff.
- E-E-A-T and tone: Neutral to somewhat casual. Sound like a tutor talking face-to-face with a student: empathy, clarity, credible authority. Avoid stiff academic or corporate tone.
- Position zero: aiSnippet (+ aiSnippetQuestion when used) should directly answer the main search intent for this profession page (featured-snippet / AI-overview style), before promotional intro.
- Actionable value: Where you edit body fields, include at least one practical tip, example, or concrete next step (e.g., confirm score with regulator, which skills to prioritize).
- Semantic depth: Naturally mention related terms when relevant (IRCC, CLB levels, PR pathways, professional registration, Paragon Testing).
- CTAs and phrasing: Prefer specific, descriptive wording (e.g., "try a free speaking practice test") over vague "click here" style.

Do not output slug. Do not output HTML.`;

type FaqRow = { question: string; answer: string };

function pickStr(v: unknown, fallback: string, max?: number): string {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  if (max != null) return t.slice(0, max);
  return t;
}

function normalizeFaqRows(raw: unknown): FaqRow[] {
  if (!Array.isArray(raw)) return [];
  const out: FaqRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const q = typeof o.question === "string" ? o.question.trim().slice(0, 300) : "";
    const a = typeof o.answer === "string" ? o.answer.trim().slice(0, 1200) : "";
    if (q && a) out.push({ question: q, answer: a });
    if (out.length >= 10) break;
  }
  return out;
}

function pickFaq(parsed: unknown, fallback: FaqRow[]): FaqRow[] {
  const rows = normalizeFaqRows(parsed);
  return rows.length >= 3 ? rows : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await ensureCmsAdmin();
    if (!admin.ok) return admin.response;

    const body = await req.json().catch(() => ({}));
    const advice = typeof body?.advice === "string" ? body.advice.trim() : "";
    const current = body?.current && typeof body.current === "object" ? body.current : {};

    if (!advice) {
      return NextResponse.json({ message: "SEO advice is required." }, { status: 400 });
    }

    const c = current as Record<string, unknown>;
    const curFaq = normalizeFaqRows(c.faq);

    const cur = {
      title: typeof c.title === "string" ? c.title : "",
      h1Highlight: typeof c.h1Highlight === "string" ? c.h1Highlight : "",
      badge: typeof c.badge === "string" ? c.badge : "",
      metaTitle: typeof c.metaTitle === "string" ? c.metaTitle : "",
      metaDescription: typeof c.metaDescription === "string" ? c.metaDescription : "",
      keywordsInput: typeof c.keywordsInput === "string" ? c.keywordsInput : "",
      aiSnippetQuestion: typeof c.aiSnippetQuestion === "string" ? c.aiSnippetQuestion : "",
      aiSnippet: typeof c.aiSnippet === "string" ? c.aiSnippet : "",
      intro: typeof c.intro === "string" ? c.intro : "",
      sectionTitle: typeof c.sectionTitle === "string" ? c.sectionTitle : "",
      sectionSubtitle: typeof c.sectionSubtitle === "string" ? c.sectionSubtitle : "",
      card1Title: typeof c.card1Title === "string" ? c.card1Title : "",
      card1Desc: typeof c.card1Desc === "string" ? c.card1Desc : "",
      card1Challenge: typeof c.card1Challenge === "string" ? c.card1Challenge : "",
      card1Solution: typeof c.card1Solution === "string" ? c.card1Solution : "",
      chooseUsTitle: typeof c.chooseUsTitle === "string" ? c.chooseUsTitle : "",
      chooseUsSubtitle: typeof c.chooseUsSubtitle === "string" ? c.chooseUsSubtitle : "",
      faq: curFaq.length >= 3 ? curFaq : [],
      ctaTitle: typeof c.ctaTitle === "string" ? c.ctaTitle : "",
      accent: typeof c.accent === "string" ? c.accent : "blue",
      icon: typeof c.icon === "string" ? c.icon : "Briefcase",
    };

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not set.");
      return NextResponse.json({ message: "AI service is not configured." }, { status: 503 });
    }

    const userMessage = `SEO advice:\n${advice}\n\nCurrent values (JSON):\n${JSON.stringify(cur, null, 2)}`;

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
    });

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text();
      console.error("OpenRouter error:", openRouterResponse.status, errText);
      return NextResponse.json({ message: "AI request failed. Try again." }, { status: 502 });
    }

    const data = await openRouterResponse.json();
    let raw: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!raw) {
      return NextResponse.json({ message: "AI returned no content." }, { status: 502 });
    }

    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error("apply-seo-advice profession: invalid JSON", raw.slice(0, 200));
      return NextResponse.json({ message: "AI returned invalid JSON." }, { status: 502 });
    }

    const accentRaw = typeof parsed.accent === "string" ? parsed.accent.trim() : cur.accent;
    const iconRaw = typeof parsed.icon === "string" ? parsed.icon.trim() : cur.icon;
    const accentParsed = ProfessionPageAccentSchema.safeParse(accentRaw);
    const iconParsed = ProfessionPageIconSchema.safeParse(iconRaw);

    const fallbackFaq = curFaq.length >= 3 ? curFaq : [];

    const out = {
      title: pickStr(parsed.title, cur.title, 160),
      h1Highlight: pickStr(parsed.h1Highlight, cur.h1Highlight),
      badge: pickStr(parsed.badge, cur.badge),
      metaTitle: pickStr(parsed.metaTitle, cur.metaTitle, 70),
      metaDescription: pickStr(parsed.metaDescription, cur.metaDescription, 160),
      keywordsInput: pickStr(
        parsed.keywordsInput ?? parsed.keywords,
        cur.keywordsInput
      ),
      aiSnippetQuestion: pickStr(parsed.aiSnippetQuestion, cur.aiSnippetQuestion, 200),
      aiSnippet: pickStr(parsed.aiSnippet, cur.aiSnippet, 400),
      intro: pickStr(parsed.intro, cur.intro, 320),
      sectionTitle: pickStr(parsed.sectionTitle, cur.sectionTitle),
      sectionSubtitle: pickStr(parsed.sectionSubtitle, cur.sectionSubtitle),
      card1Title: pickStr(parsed.card1Title, cur.card1Title),
      card1Desc: pickStr(parsed.card1Desc, cur.card1Desc),
      card1Challenge: pickStr(parsed.card1Challenge, cur.card1Challenge),
      card1Solution: pickStr(parsed.card1Solution, cur.card1Solution),
      chooseUsTitle: pickStr(parsed.chooseUsTitle, cur.chooseUsTitle),
      chooseUsSubtitle: pickStr(parsed.chooseUsSubtitle, cur.chooseUsSubtitle),
      faq: pickFaq(parsed.faq, fallbackFaq),
      ctaTitle: pickStr(parsed.ctaTitle, cur.ctaTitle),
      accent: accentParsed.success ? accentParsed.data : cur.accent,
      icon: iconParsed.success ? iconParsed.data : cur.icon,
    };

    return NextResponse.json(out, { status: 200 });
  } catch (error) {
    console.error("profession-pages apply-seo-advice error:", error);
    return NextResponse.json({ message: "Failed to apply SEO fixes." }, { status: 500 });
  }
}
