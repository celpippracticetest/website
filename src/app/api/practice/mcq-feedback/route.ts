import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { resolveOpenRouterEvalModel } from "@/lib/openrouterEvaluation";

export const runtime = "nodejs";
export const maxDuration = 45;

const QuestionItemSchema = z.object({
  question: z.string(),
  userAnswer: z.string().optional(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
  explanation: z.string().optional(),
});

const McqFeedbackRequestSchema = z.object({
  skill: z.enum(["Reading", "Listening"]),
  practiceId: z.string().min(1),
  context: z.enum(["practice", "mock"]).optional().default("practice"),
  taskName: z.string().optional(),
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
  wrong: z.number().int().min(0),
  notAnswered: z.number().int().min(0),
  questions: z.array(QuestionItemSchema).min(1),
  passageExcerpt: z.string().optional(),
});

const McqFeedbackResponseSchema = z.object({
  summary: z.string(),
  clbEstimate: z.string().optional(),
  priorities: z.array(z.string()),
  studyTips: z.array(z.string()),
  nextStep: z.string(),
});

const SYSTEM_PROMPT = `You are a CELPIP exam coach. Analyze a practice attempt for Reading or Listening MCQ tasks.

Return ONLY valid JSON (no markdown) with this shape:
{
  "summary": "2-3 sentences on performance and main weakness pattern",
  "clbEstimate": "CLB X–Y (brief reason)",
  "priorities": ["2-3 specific skills to fix"],
  "studyTips": ["2-3 actionable tips tied to wrong answers"],
  "nextStep": "one concrete action for the next 24 hours"
}

Rules:
- Be concise, encouraging, and exam-focused.
- Reference wrong-answer patterns when present (inference, detail, vocabulary, distractors).
- Do not guarantee scores.
- For Listening, mention note-taking or previewing questions when relevant.
- For Reading, mention scanning, paraphrase traps, or inference when relevant.`;

const MOCK_SYSTEM_ADDENDUM = `

When context is a full mock exam (not isolated practice):
- Tie advice to timed mock conditions and moving on after each section.
- Mention stamina, answer transfer, and not losing points on skipped items.
- Suggest one focus for the next full mock vs. isolated skill practice.`;

function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (match) return JSON.parse(match[1]);
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Invalid JSON from model");
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(req);
    if (!authContext?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = McqFeedbackRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return NextResponse.json(
        { error: "AI feedback is temporarily unavailable" },
        { status: 503 }
      );
    }

    const wrongItems = data.questions.filter((q) => !q.isCorrect);
    const userContent = JSON.stringify(
      {
        context: data.context,
        skill: data.skill,
        taskName: data.taskName,
        score: `${data.correct}/${data.total}`,
        wrong: data.wrong,
        notAnswered: data.notAnswered,
        wrongQuestions: wrongItems.slice(0, 8),
        passageExcerpt: data.passageExcerpt,
      },
      null,
      2
    );

    const systemPrompt =
      data.context === "mock" ? SYSTEM_PROMPT + MOCK_SYSTEM_ADDENDUM : SYSTEM_PROMPT;

    const model =
      resolveOpenRouterEvalModel() ?? "qwen/qwen3-next-80b-a3b-instruct";

    const upstreamAbort = new AbortController();
    const timer = setTimeout(() => upstreamAbort.abort(), 40_000);

    let response: Response;
    try {
      response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          signal: upstreamAbort.signal,
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "HTTP-Referer": "https://celpippracticetest.com",
            "X-Title": "CELPIP Practice Test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            temperature: 0.3,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
          }),
        }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      console.error("MCQ feedback OpenRouter error:", await response.text());
      return NextResponse.json(
        { error: "Could not generate feedback" },
        { status: 502 }
      );
    }

    const llmData = await response.json();
    const content = llmData.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 502 }
      );
    }

    const json = parseJsonContent(content);
    const feedback = McqFeedbackResponseSchema.safeParse(json);
    if (!feedback.success) {
      console.error("MCQ feedback parse error:", feedback.error);
      return NextResponse.json(
        { error: "Could not parse AI feedback" },
        { status: 502 }
      );
    }

    return NextResponse.json(feedback.data);
  } catch (error) {
    console.error("POST /api/practice/mcq-feedback failed:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
