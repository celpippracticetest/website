import {
  findPoolContent,
  insertPoolContent,
} from "@/repositories/learningContentPool.repo";
import {
  buildSkillUserPrompt,
  DAILY_LEARNING_SYSTEM_PROMPT,
  fillPromptTemplate,
  getExamTask,
  getLessonTopic,
} from "@/lib/learning/prompts";
import {
  DailyLessonContentSchema,
  type DailyLessonContent,
  type LearningSkill,
} from "@/lib/learning/types";
import { resolveOpenRouterEvalModel } from "@/lib/openrouterEvaluation";
import { startLearningTimer } from "@/lib/learning/learningTimingLog";

const LEARNING_MAX_TOKENS = 4096;
const LEARNING_TEMPERATURE = 0.7;

function parseJsonContent(raw: string): DailyLessonContent {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  const slice =
    jsonStart >= 0 && jsonEnd > jsonStart
      ? trimmed.slice(jsonStart, jsonEnd + 1)
      : trimmed;
  const parsed = JSON.parse(slice) as unknown;
  return DailyLessonContentSchema.parse(parsed);
}

export async function generateLessonContent(input: {
  skill: LearningSkill;
  currentClb: number;
  targetClb: number;
  sequenceNumber: number;
}): Promise<{ content: DailyLessonContent; model: string }> {
  const lessonTopic = getLessonTopic(input.skill, input.sequenceNumber);
  const examTask = getExamTask(input.skill, input.sequenceNumber);

  const system = fillPromptTemplate(DAILY_LEARNING_SYSTEM_PROMPT, {
    SKILL: input.skill.charAt(0) + input.skill.slice(1).toLowerCase(),
    EXAM_TASK: examTask,
    LESSON_TOPIC: lessonTopic,
    SEQUENCE_NUMBER: input.sequenceNumber,
    CURRENT_CLB: input.currentClb,
    TARGET_CLB: input.targetClb,
  });

  const user = buildSkillUserPrompt(input.skill, {
    currentClb: input.currentClb,
    targetClb: input.targetClb,
    sequenceNumber: input.sequenceNumber,
    lessonTopic,
    examTask,
  });

  const model =
    process.env.OPENROUTER_LEARNING_MODEL?.trim() ||
    resolveOpenRouterEvalModel() ||
    "qwen/qwen-2.5-72b-instruct";

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const endOpenRouter = startLearningTimer("generateLessonContent.openRouter", {
    skill: input.skill,
    sequenceNumber: input.sequenceNumber,
    model,
  });
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://celpippracticetest.com",
      "X-Title": "CELPIP Daily Learning",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: LEARNING_TEMPERATURE,
      max_tokens: LEARNING_MAX_TOKENS,
    }),
  });

  endOpenRouter({ status: response.status, ok: response.ok });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`OpenRouter error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const contentRaw = data.choices?.[0]?.message?.content;
  if (!contentRaw) {
    throw new Error("OpenRouter returned empty content");
  }

  const content = parseJsonContent(contentRaw);
  return { content, model };
}

export async function getOrCreatePoolLesson(input: {
  skill: LearningSkill;
  currentClb: number;
  targetClb: number;
  sequenceNumber: number;
}): Promise<{ poolId: string; content: DailyLessonContent }> {
  const endPool = startLearningTimer("getOrCreatePoolLesson", input);
  const endFind = startLearningTimer("getOrCreatePoolLesson.findPoolContent", input);
  const existing = await findPoolContent(
    input.skill,
    input.currentClb,
    input.targetClb,
    input.sequenceNumber
  );
  endFind({ hit: Boolean(existing) });
  if (existing) {
    endPool({ source: "pool_cache", poolId: existing.id });
    return { poolId: existing.id, content: existing.content };
  }

  const endGenerate = startLearningTimer("getOrCreatePoolLesson.generate", input);
  const { content, model } = await generateLessonContent(input);
  endGenerate({ model });

  const endInsert = startLearningTimer("getOrCreatePoolLesson.insertPoolContent", input);
  const inserted = await insertPoolContent({
    skill: input.skill,
    currentClb: input.currentClb,
    targetClb: input.targetClb,
    sequenceNumber: input.sequenceNumber,
    content,
    model,
  });
  endInsert({ poolId: inserted.id });
  endPool({ source: "generated", poolId: inserted.id });
  return { poolId: inserted.id, content: inserted.content };
}
