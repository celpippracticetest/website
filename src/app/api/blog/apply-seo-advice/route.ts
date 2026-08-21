import { NextRequest, NextResponse } from "next/server";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const SYSTEM_PROMPT = `You are a blog SEO editor for CELPIP Practice Test (celpipguide.ca).
You will receive existing blog form values and an "SEO advice" instruction list.
Your task: update ONLY what is necessary to satisfy the advice, then output a single JSON object.

Output requirements:
- Output ONLY valid JSON (no markdown, no code fences, no explanation).
- Keep contentHtml as an HTML fragment using only these tags: <p>, <h2>, <h3>, <h4>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <a href="...">.
- Do NOT use <h1>. (The page H1 is the blog Title field.)
- Start contentHtml with <p> or <h2>.
- Headings (H2/H3): prefer clear, reader-first section titles; do not turn every heading into a keyword stack (avoid \"What Is CELPIP [section]?\"-style titles). Keep primary phrases in body paragraphs and meta fields where appropriate.
- Make edits by weaving keywords naturally; avoid keyword stuffing.
- Do NOT wrap keywords, CLB levels, or phrases like "practice test" or "study plan" in <a> tags. Unwrap any generated keyword links to plain text.
- Keep the article coherent and consistent with the input.

JSON schema:
{
  "title": "string (3-160 chars). Updated blog title.",
  "excerpt": "string (max 320 chars). Updated excerpt.",
  "metaTitle": "string (max 70 chars). Updated SEO title.",
  "metaDescription": "string (max 160 chars). Updated SEO description.",
  "keywordsInput": "string. Comma-separated keywords.",
  "contentHtml": "string. Full updated blog body as HTML fragment."
}

Now edit the blog based on the provided advice.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const advice = typeof body?.advice === "string" ? body.advice.trim() : "";
    const current = body?.current && typeof body.current === "object" ? body.current : {};

    const currentTitle = typeof current.title === "string" ? current.title : "";
    const currentExcerpt = typeof current.excerpt === "string" ? current.excerpt : "";
    const currentMetaTitle = typeof current.metaTitle === "string" ? current.metaTitle : "";
    const currentMetaDescription = typeof current.metaDescription === "string" ? current.metaDescription : "";
    const currentKeywordsInput = typeof current.keywordsInput === "string" ? current.keywordsInput : "";
    const currentContentHtml = typeof current.contentHtml === "string" ? current.contentHtml : "";

    if (!advice) {
      return NextResponse.json({ message: "SEO advice is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not set.");
      return NextResponse.json({ message: "AI service is not configured." }, { status: 503 });
    }

    const userMessage = `SEO advice:\n${advice}\n\nCurrent blog values:\n- title: ${currentTitle}\n- excerpt: ${currentExcerpt}\n- metaTitle: ${currentMetaTitle}\n- metaDescription: ${currentMetaDescription}\n- keywordsInput: ${currentKeywordsInput}\n- contentHtml:\n${currentContentHtml}`;

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

    // Strip markdown code blocks if present.
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error("apply-seo-advice: invalid JSON", raw.slice(0, 200));
      return NextResponse.json({ message: "AI returned invalid JSON." }, { status: 502 });
    }

    const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 160) : currentTitle;
    const excerpt = typeof parsed.excerpt === "string" ? parsed.excerpt.trim().slice(0, 320) : currentExcerpt;
    const metaTitle = typeof parsed.metaTitle === "string" ? parsed.metaTitle.trim().slice(0, 70) : currentMetaTitle;
    const metaDescription =
      typeof parsed.metaDescription === "string" ? parsed.metaDescription.trim().slice(0, 160) : currentMetaDescription;

    const keywordsInput =
      typeof parsed.keywordsInput === "string"
        ? parsed.keywordsInput.trim()
        : typeof parsed.keywords === "string"
          ? parsed.keywords.trim()
          : currentKeywordsInput;

    let contentHtml =
      typeof parsed.contentHtml === "string" && parsed.contentHtml.trim() ? parsed.contentHtml.trim() : currentContentHtml;

    // Defensive: prevent <h1> from reaching the client editor.
    contentHtml = contentHtml
      .replace(/<h1([^>]*)>/gi, "<h2$1>")
      .replace(/<\/h1>/gi, "</h2>");

    // Ensure the output stays consistent with the editor expectations (no leading newline).
    contentHtml = contentHtml.replace(/^\s+/, "");

    return NextResponse.json(
      {
        title,
        slug: slugify(title),
        excerpt,
        metaTitle,
        metaDescription,
        keywordsInput,
        contentHtml,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("apply-seo-advice error:", error);
    return NextResponse.json({ message: "Failed to apply SEO fixes." }, { status: 500 });
  }
}

