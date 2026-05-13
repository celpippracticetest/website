import documentsClient from "@/lib/appDocumentsClient";
import { BlogTargetKeywordRepository } from "@/repositories/blog-target-keyword.repo";
import { NextRequest, NextResponse } from "next/server";

const WIKI_CATEGORIES = ["General", "Reading", "Writing", "Listening", "Speaking"] as const;

const SYSTEM_PROMPT = `You are an expert CELPIP instructor and SEO content writer for CELPIP Practice Test (celpippracticetest.com).
Given a user prompt, output a single JSON object that fills the entire wiki article create form.
Output ONLY valid JSON, no markdown, no code fences, no explanation.

JSON schema:
{
  "title": "string, 1-200 chars, clear wiki article title",
  "slug": "string, lowercase a-z 0-9 hyphens only, URL-safe from title",
  "description": "string, max 500 chars, meta-style description for cards and SEO",
  "category": "string, exactly one of: General, Reading, Writing, Listening, Speaking",
  "color": "string, hex banner color e.g. #3ebbf3 or #2563eb",
  "summary": "string, max 500 chars, brief summary for related/next article cards",
  "content": "string, full article body as HTML. Use: <p>, <h2>, <h3>, <h4>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <a href=\"...\">, <table> if needed. Do NOT use <h1> (page title is the article title).",
  "sortOrder": "number, integer >= 0, default 0 for new articles"
}

Rules:
- ESL-friendly: short sentences, B1/B2 vocabulary, helpful for test-takers.
- Start content with <h2> or <p> with a direct answer to the topic when possible.
- Include practical tips or examples where relevant.
- Internal links: descriptive anchor text; prefer paths like /wiki/... or /blog/... when relevant.
- slug: only a-z, 0-9, hyphens.
- If unsure for category, use General.
- sortOrder: use 0 unless the prompt asks for a specific ordering.`;

function normalizeCategory(value: unknown): string {
  const s = typeof value === "string" ? value.trim() : "";
  const found = WIKI_CATEGORIES.find((c) => c.toLowerCase() === s.toLowerCase());
  return found ?? "General";
}

function normalizeColor(value: unknown): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (/^#[0-9A-Fa-f]{6}$/.test(s) || /^#[0-9A-Fa-f]{3}$/.test(s)) {
    return s.length === 4
      ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase()
      : s.toLowerCase();
  }
  return "#3ebbf3";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt =
      typeof body.prompt === "string" && body.prompt.trim() ? body.prompt.trim() : null;
    const title =
      typeof body.title === "string" && body.title.trim() ? body.title.trim() : undefined;

    if (!prompt) {
      return NextResponse.json({ message: "Prompt is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not set.");
      return NextResponse.json({ message: "AI service is not configured." }, { status: 503 });
    }

    let targetPhrases: string[] = [];
    try {
      const kwRepo = new BlogTargetKeywordRepository(documentsClient);
      targetPhrases = await kwRepo.listActivePhrases();
    } catch (e) {
      console.warn("Wiki generate-content: could not load target keywords", e);
    }

    const keywordsBlock =
      targetPhrases.length > 0
        ? `\n\nSite-wide SEO target keywords from CMS (use each phrase at least once naturally in content and/or description when relevant):\n${targetPhrases.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
        : "";

    const userMessage = title
      ? `Optional context — working title: ${title}\n\nGenerate the full wiki article JSON for:\n\n${prompt}${keywordsBlock}`
      : `Generate the full wiki article JSON for:\n\n${prompt}${keywordsBlock}`;

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
      const err = await openRouterResponse.text();
      console.error("OpenRouter error:", openRouterResponse.status, err);
      return NextResponse.json({ message: "AI request failed. Try again." }, { status: 502 });
    }

    const data = await openRouterResponse.json();
    let raw: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!raw) {
      return NextResponse.json({ message: "AI returned no content." }, { status: 502 });
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
      console.error("Wiki generate-content: invalid JSON", raw.slice(0, 200));
      return NextResponse.json({ message: "AI returned invalid JSON." }, { status: 502 });
    }

    const slugRaw =
      typeof parsed.slug === "string"
        ? parsed.slug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
        : "";
    const titleStr =
      typeof parsed.title === "string" ? parsed.title.trim().slice(0, 200) : "";
    const slug =
      slugRaw ||
      titleStr
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    let sortOrder = 0;
    if (typeof parsed.sortOrder === "number" && Number.isFinite(parsed.sortOrder)) {
      sortOrder = Math.max(0, Math.floor(parsed.sortOrder));
    } else if (typeof parsed.sortOrder === "string" && /^\d+$/.test(parsed.sortOrder.trim())) {
      sortOrder = Math.max(0, parseInt(parsed.sortOrder.trim(), 10));
    }

    const payload = {
      title: titleStr,
      slug,
      description:
        typeof parsed.description === "string" ? parsed.description.trim().slice(0, 500) : "",
      category: normalizeCategory(parsed.category),
      color: normalizeColor(parsed.color),
      summary: typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 500) : "",
      content: typeof parsed.content === "string" ? parsed.content.trim() : "",
      sortOrder,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Wiki generate-content error:", error);
    return NextResponse.json({ message: "Failed to generate content." }, { status: 500 });
  }
}
