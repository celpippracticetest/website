import documentsClient from "@/lib/appDocumentsClient";
import { BlogTargetKeywordRepository } from "@/repositories/blog-target-keyword.repo";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert, certified CELPIP instructor and SEO content writer for CELPIP Practice Test (celpipguide.ca). Your audience consists of ESL (English as a Second Language) test-takers preparing for the CELPIP exam to achieve their Canadian PR or citizenship.
Given a user prompt, you must output a single JSON object that fills the entire blog create form.
Output ONLY valid JSON, no markdown, no code fences, no explanation.
JSON schema (all string lengths are limits; stay under them):
{"title": "string, 3-160 chars, compelling, 
conversational blog title targeting long-tail voice search queries",
"slug": "string, lowercase letters numbers hyphens only, URL-safe slug from title",
"excerpt": "string, max 320 chars, short summary for cards and snippets that hooks the reader",
"contentHtml": "string, 
full blog body as HTML. Use only: <p>, <h2>, <h3>, <h4>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <a href="...">. 
No <h1>. Start with an H2 or a 'Position Zero' <p>.
Headings (H2/H3): Use natural section titles for readers—do not cram the exam name, skill, and task number into every heading (avoid patterns like \"What Is CELPIP Speaking Task 3?\"). Keep target keywords in paragraphs, metaTitle, and body copy instead of repeating them in each heading.",
"metaTitle": "string, max 70 chars, SEO title including the primary keyword near the front",
"metaDescription": "string, max 160 chars, compelling SERP description ending with a call to action",
"keywords": "string, comma-separated SEO keywords including semantic terms (e.g., IRCC, CLB)",
"categories": "string, comma-separated categories e.g. Reading, Writing, Speaking, Listening",
"tags": "string, comma-separated tags","faq": [{"question": "string, conversational/voice-search question",
 "answer": "string, concise answer"}, ...],
 "aiSnippet": {"question": "string, target conversational question for AI search", "answer": "string, max 400 chars, concise 50-60 word direct answer"}}
 
 Rules:ESL Readability (Crucial): Aim for a Flesch reading-ease score of 70-85 (6th to 8th-grade level,
  "Fairly easy" to "Easy to read"). Keep sentences short, paragraphs brief (2-3 sentences),
   minimize multi-syllable words, and use simple B1/B2-level vocabulary.
   Target Keywords: Ensure all core target keywords provided in the prompt are used at least once naturally within the contentHtml.E-E-A-T & Tone of Voice: Use a "Neutral" to "Somewhat casual" tone. Pretend you are speaking face-to-face with a student you are tutoring. Write with human empathy and expert authority. Avoid highly formal academic jargon, "Very formal" phrasing, or generic AI-sounding fluff.Content Structure: The first 1-2 paragraphs MUST be a "Position Zero" paragraph—a direct, concise answer to the main topic to capture AI Overviews and featured snippets.Actionable Value: Include at least one practical example, sample answer, or actionable tip within the HTML.Semantic Depth: Naturally include related semantic terms (e.g., IRCC, CLB levels, PR application, Paragon Testing).Multimedia Placeholders: Use HTML comments for media placeholders where appropriate (e.g., <!-- INSERT AUDIO: Sample speaking response --> or <!-- INSERT IMAGE: alt="CELPIP scoring rubric" -->).Internal Linking: When adding <a> tags, use descriptive anchor text (e.g., "try our free speaking practice test" instead of "click here").slug: lowercase, only a-z 0-9 and hyphens, e.g. "how-to-score-clb-9-in-speaking-2026"contentHtml: valid HTML fragment only, no \n inside strings (escape as needed in JSON).faq: 2-4 Q&A pairs that target natural, long-tail voice search queries.aiSnippet: one key question and a direct, concise answer for AI engines (Perplexity, Gemini, ChatGPT).`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt =
      typeof body.prompt === "string" && body.prompt.trim()
        ? body.prompt.trim()
        : null;
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : undefined;

    if (!prompt) {
      return NextResponse.json(
        { message: "Prompt is required." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not set.");
      return NextResponse.json(
        { message: "AI service is not configured." },
        { status: 503 },
      );
    }

    let targetPhrases: string[] = [];
    try {
      const kwRepo = new BlogTargetKeywordRepository(documentsClient);
      targetPhrases = await kwRepo.listActivePhrases();
    } catch (e) {
      console.warn("Blog generate-content: could not load target keywords", e);
    }

    const keywordsBlock =
      targetPhrases.length > 0
        ? `\n\nSite-wide SEO target keywords from your CMS (mandatory: use each phrase at least once naturally in contentHtml; include every phrase in the comma-separated "keywords" field together with other relevant terms; use in meta where they fit naturally):\n${targetPhrases.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
        : "";

    const userMessage = title
      ? `Optional context - blog title: ${title}\n\nGenerate the full blog form JSON for this prompt:\n\n${prompt}${keywordsBlock}`
      : `Generate the full blog form JSON for this prompt:\n\n${prompt}${keywordsBlock}`;

    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://celpipguide.ca",
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
      },
    );

    if (!openRouterResponse.ok) {
      const err = await openRouterResponse.text();
      console.error("OpenRouter error:", openRouterResponse.status, err);
      return NextResponse.json(
        { message: "AI request failed. Try again." },
        { status: 502 },
      );
    }

    const data = await openRouterResponse.json();
    let raw: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!raw) {
      return NextResponse.json(
        { message: "AI returned no content." },
        { status: 502 },
      );
    }

    // Strip markdown code blocks if present
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
      console.error("Blog generate-content: invalid JSON", raw.slice(0, 200));
      return NextResponse.json(
        { message: "AI returned invalid JSON." },
        { status: 502 },
      );
    }

    // Normalize into the shape the form expects
    const slug =
      typeof parsed.slug === "string"
        ? parsed.slug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
        : "";
    const faq = Array.isArray(parsed.faq)
      ? parsed.faq
          .filter(
            (item): item is { question?: string; answer?: string } =>
              item != null && typeof item === "object",
          )
          .map((item) => ({
            question: String(item.question ?? "").trim(),
            answer: String(item.answer ?? "").trim(),
          }))
          .filter((item) => item.question || item.answer)
      : [];
    const aiSnippet =
      parsed.aiSnippet != null &&
      typeof parsed.aiSnippet === "object" &&
      !Array.isArray(parsed.aiSnippet)
        ? {
            question: String(
              (parsed.aiSnippet as Record<string, unknown>).question ?? "",
            ).trim(),
            answer: String(
              (parsed.aiSnippet as Record<string, unknown>).answer ?? "",
            )
              .trim()
              .slice(0, 400),
          }
        : { question: "", answer: "" };

    const payload = {
      title:
        typeof parsed.title === "string"
          ? parsed.title.trim().slice(0, 160)
          : "",
      slug:
        slug ||
        (typeof parsed.title === "string"
          ? parsed.title
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/-+/g, "-")
          : ""),
      excerpt:
        typeof parsed.excerpt === "string"
          ? parsed.excerpt.trim().slice(0, 320)
          : "",
      contentHtml:
        typeof parsed.contentHtml === "string" ? parsed.contentHtml.trim() : "",
      metaTitle:
        typeof parsed.metaTitle === "string"
          ? parsed.metaTitle.trim().slice(0, 70)
          : "",
      metaDescription:
        typeof parsed.metaDescription === "string"
          ? parsed.metaDescription.trim().slice(0, 160)
          : "",
      keywordsInput:
        typeof parsed.keywords === "string"
          ? parsed.keywords.trim()
          : Array.isArray(parsed.keywords)
            ? (parsed.keywords as string[]).join(", ")
            : "",
      categoriesInput:
        typeof parsed.categories === "string"
          ? parsed.categories.trim()
          : Array.isArray(parsed.categories)
            ? (parsed.categories as string[]).join(", ")
            : "",
      tagsInput:
        typeof parsed.tags === "string"
          ? parsed.tags.trim()
          : Array.isArray(parsed.tags)
            ? (parsed.tags as string[]).join(", ")
            : "",
      faq,
      aiSnippet,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Blog generate-content error:", error);
    return NextResponse.json(
      { message: "Failed to generate content." },
      { status: 500 },
    );
  }
}
