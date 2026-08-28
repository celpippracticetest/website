import documentsClient from "@/lib/appDocumentsClient";
import { BlogRepository } from "@/repositories/blog.repo";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert, certified CELPIP instructor and SEO content writer for CELPIP Practice Test (celpippracticetest.com). Your audience consists of ESL (English as a Second Language) test-takers preparing for the CELPIP exam to achieve their Canadian PR or citizenship.
Given a user prompt containing recent forum discussions or news, you must output a single JSON object that fills the entire blog create form.
Output ONLY valid JSON, no markdown, no code fences, no explanation.
JSON schema (all string lengths are limits; stay under them):
{"title": "string, 3-160 chars, compelling, conversational blog title targeting long-tail voice search queries",
"slug": "string, lowercase letters numbers hyphens only, URL-safe slug from title",
"excerpt": "string, max 320 chars, short summary for cards and snippets that hooks the reader",
"contentHtml": "string, full blog body as HTML. Use only: <p>, <h2>, <h3>, <h4>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <a href=\"...\">. No <h1>. Start with an H2 or a 'Position Zero' <p>.",
"metaTitle": "string, max 70 chars, SEO title including the primary keyword near the front",
"metaDescription": "string, max 160 chars, compelling SERP description ending with a call to action",
"keywords": "string, comma-separated SEO keywords including semantic terms (e.g., IRCC, CLB)",
"categories": "string, comma-separated categories e.g. Reading, Writing, Speaking, Listening",
"tags": "string, comma-separated tags",
"faq": [{"question": "string, conversational/voice-search question", "answer": "string, concise answer"}],
"aiSnippet": {"question": "string, target conversational question for AI search", "answer": "string, max 400 chars, concise 50-60 word direct answer"}}

Rules:
- ESL Readability (Crucial): Aim for a Flesch reading-ease score of 70-85. Keep sentences short, minimize multi-syllable words, and use simple B1/B2-level vocabulary.
- E-E-A-T & Tone of Voice: Use a "Neutral" to "Somewhat casual" tone. Write with human empathy and expert authority. Avoid highly formal academic jargon.
- Content Structure: The first 1-2 paragraphs MUST be a "Position Zero" paragraph—a direct, concise answer to the main topic to capture AI Overviews.
- Actionable Value: Include at least one practical example, sample answer, or actionable tip within the HTML.
- Internal Linking: You MAY add editorial <a> tags the reader can click (related articles or useful site pages). Use descriptive anchor text. Do NOT auto-wrap keywords, CLB levels, or short phrases like "practice test" on every mention.
- slug: lowercase, only a-z 0-9 and hyphens.
- contentHtml: valid HTML fragment only, no \n inside strings (escape as needed in JSON).
- faq: 2-4 Q&A pairs that target natural, long-tail voice search queries.
- aiSnippet: one key question and a direct, concise answer for AI engines.`;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const tokenParams = req.nextUrl.searchParams.get("token");
    const CRON_SECRET = process.env.CRON_SECRET;

    if (
      (!CRON_SECRET || tokenParams !== CRON_SECRET) &&
      authHeader !== `Bearer ${CRON_SECRET}`
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Trending Topics from Reddit
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    let redditContent = "";
    if (clientId && clientSecret) {
      try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "celpip-blog-generator/1.0.0",
          },
          body: "grant_type=client_credentials",
        });
        
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;

          // Fetch top posts from the last 24 hours from r/CELPIP
          const redditRes = await fetch(
            "https://oauth.reddit.com/r/CELPIP/top.json?t=day&limit=3",
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "celpip-blog-generator/1.0.0",
              },
            }
          );

          if (redditRes.ok) {
            const data = await redditRes.json();
            const posts = data.data?.children || [];
            if (posts.length > 0) {
              redditContent = posts
                .map(
                  (p: any, i: number) =>
                    `Topic ${i + 1}: ${p.data.title}\nDetails: ${
                      p.data.selftext?.slice(0, 500) || "No details provided."
                    }`
                )
                .join("\n\n");
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch from Reddit", e);
      }
    }

    if (!redditContent) {
      redditContent = "General advice on achieving CLB 9+ in CELPIP speaking and writing tasks.";
    }

    // 2. Generate Blog using LLM
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "AI service is not configured." }, { status: 503 });
    }

    const prompt = `Here are the top trending questions and discussions from Reddit about the CELPIP exam today:\n\n${redditContent}\n\nPlease create an insightful, SEO-optimized blog post addressing these common topics or the single most prominent topic. Ensure it's helpful for CELPIP test-takers.`;

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
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
      }),
    });

    if (!openRouterResponse.ok) {
      const err = await openRouterResponse.text();
      console.error("OpenRouter error:", openRouterResponse.status, err);
      return NextResponse.json({ message: "AI request failed." }, { status: 502 });
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
      console.error("Blog generate-content: invalid JSON", raw.slice(0, 200));
      return NextResponse.json({ message: "AI returned invalid JSON." }, { status: 502 });
    }

    // 4. Save Blog to Database
    const repo = new BlogRepository(documentsClient);

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
          .filter((item): item is { question?: string; answer?: string } => item != null && typeof item === "object")
          .map((item) => ({
            question: String(item.question ?? "").trim(),
            answer: String(item.answer ?? "").trim(),
          }))
          .filter((item) => item.question || item.answer)
      : [];

    const aiSnippet =
      parsed.aiSnippet != null && typeof parsed.aiSnippet === "object" && !Array.isArray(parsed.aiSnippet)
        ? {
            question: String((parsed.aiSnippet as Record<string, unknown>).question ?? "").trim(),
            answer: String((parsed.aiSnippet as Record<string, unknown>).answer ?? "").trim().slice(0, 400),
          }
        : { question: "", answer: "" };

    const payload = {
      title: typeof parsed.title === "string" && parsed.title.trim().length > 3 ? parsed.title.trim().slice(0, 160) : "Automated CELPIP Blog",
      slug: slug || "auto-blog-" + Date.now(),
      excerpt: typeof parsed.excerpt === "string" ? parsed.excerpt.trim().slice(0, 320) : "",
      contentHtml: typeof parsed.contentHtml === "string" ? parsed.contentHtml.trim() : "",
      status: "draft" as const,
      authorName: "CELPIP Practice Test Team",
      categories: typeof parsed.categories === "string" 
        ? parsed.categories.split(',').map(s => s.trim()).filter(Boolean) 
        : (Array.isArray(parsed.categories) ? parsed.categories : ["General"]),
      tags: typeof parsed.tags === "string"
        ? parsed.tags.split(',').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(parsed.tags) ? parsed.tags : ["Tips"]),
      faq,
      aiSnippet,
      seo: {
        keywords: typeof parsed.keywords === "string"
          ? parsed.keywords.split(',').map(s => s.trim()).filter(Boolean)
          : (Array.isArray(parsed.keywords) ? parsed.keywords : []),
        metaTitle: typeof parsed.metaTitle === "string" ? parsed.metaTitle.trim().slice(0, 70) : "",
        metaDescription: typeof parsed.metaDescription === "string" ? parsed.metaDescription.trim().slice(0, 160) : "",
      },
      publishedAt: null,
    };

    const blog = await repo.createBlog(payload as any);

    // 5. Optional: Post to LinkedIn
    // We can call the LinkedIn API similarly if we want (or just let it be published silently).
    const publishToLinkedIn = false; // Disabled since the post is now a draft
    let linkedinResult = { attempted: false, success: false, message: "Skipped" };

    if (publishToLinkedIn) {
      const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
      const authorUrn = process.env.LINKEDIN_AUTHOR_URN;

      if (accessToken && authorUrn) {
        const blogUrl = `https://celpippracticetest.com/blog/${blog.slug}`;
        const shareCommentary = `${blog.title}\n\n${(blog.excerpt ?? "").trim()}`.trim().slice(0, 1200);

        try {
          const linkedinRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-Restli-Protocol-Version": "2.0.0",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              author: authorUrn,
              lifecycleState: "PUBLISHED",
              specificContent: {
                "com.linkedin.ugc.ShareContent": {
                  shareCommentary: { text: shareCommentary },
                  shareMediaCategory: "ARTICLE",
                  media: [
                    {
                      status: "READY",
                      originalUrl: blogUrl,
                      title: { text: blog.title.slice(0, 200) },
                      description: { text: (blog.excerpt ?? "").slice(0, 256) },
                    },
                  ],
                },
              },
              visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
              },
            }),
          });
          
          if (linkedinRes.ok) {
            linkedinResult = { attempted: true, success: true, message: "Published to LinkedIn" };
          } else {
            const errTxt = await linkedinRes.text();
            console.error("LinkedIn publish failed:", errTxt);
            linkedinResult = { attempted: true, success: false, message: errTxt };
          }
        } catch (e) {
          console.error("LinkedIn publish error:", e);
          linkedinResult = { attempted: true, success: false, message: "Exception occurred" };
        }
      }
    }

    return NextResponse.json({ success: true, id: blog.id, linkedinResult }, { status: 200 });
  } catch (error) {
    console.error("Cron generate-blog error:", error);
    return NextResponse.json({ message: "Failed to run cron job." }, { status: 500 });
  }
}
