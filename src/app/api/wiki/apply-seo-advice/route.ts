import { NextRequest, NextResponse } from "next/server";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const SYSTEM_PROMPT = `You are a wiki SEO editor for CELPIP Practice Test (celpippracticetest.com).
You receive existing wiki article fields and an "SEO advice" instruction list.
Update ONLY what is necessary to satisfy the advice, then output a single JSON object.

Output requirements:
- Output ONLY valid JSON (no markdown, no code fences, no explanation).
- Keep content as an HTML fragment using: <p>, <h2>, <h3>, <h4>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <a href="...">, tables if present in input.
- Do NOT use <h1>. (The page H1 is the wiki Title field.)
- Weave keywords naturally; avoid keyword stuffing.

JSON schema:
{
  "title": "string (1-200 chars). Updated article title.",
  "description": "string (max 500 chars). Updated description for SEO/cards.",
  "summary": "string (max 500 chars). Updated summary for related cards.",
  "content": "string. Full updated HTML body."
}

Now edit the wiki article based on the provided advice.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const advice = typeof body?.advice === "string" ? body.advice.trim() : "";
    const current = body?.current && typeof body.current === "object" ? body.current : {};

    const currentTitle = typeof current.title === "string" ? current.title : "";
    const currentDescription = typeof current.description === "string" ? current.description : "";
    const currentSummary = typeof current.summary === "string" ? current.summary : "";
    const currentContent = typeof current.content === "string" ? current.content : "";

    if (!advice) {
      return NextResponse.json({ message: "SEO advice is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not set.");
      return NextResponse.json({ message: "AI service is not configured." }, { status: 503 });
    }

    const userMessage = `SEO advice:\n${advice}\n\nCurrent wiki values:\n- title: ${currentTitle}\n- description: ${currentDescription}\n- summary: ${currentSummary}\n- content:\n${currentContent}`;

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
      console.error("Wiki apply-seo-advice: invalid JSON", raw.slice(0, 200));
      return NextResponse.json({ message: "AI returned invalid JSON." }, { status: 502 });
    }

    const title =
      typeof parsed.title === "string" ? parsed.title.trim().slice(0, 200) : currentTitle;
    const description =
      typeof parsed.description === "string"
        ? parsed.description.trim().slice(0, 500)
        : currentDescription;
    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 500) : currentSummary;

    let content =
      typeof parsed.content === "string" && parsed.content.trim()
        ? parsed.content.trim()
        : currentContent;

    content = content.replace(/<h1([^>]*)>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
    content = content.replace(/^\s+/, "");

    return NextResponse.json(
      {
        title,
        slug: slugify(title),
        description,
        summary,
        content,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Wiki apply-seo-advice error:", error);
    return NextResponse.json({ message: "Failed to apply SEO fixes." }, { status: 500 });
  }
}
