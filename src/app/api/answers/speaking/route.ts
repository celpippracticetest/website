import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import {
  S3Client,
  type CompleteMultipartUploadOutput,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createClient } from "@deepgram/sdk";
import { PracticeRepository } from "@/repositories/practice.repo";
import { WritingAnswerRepository } from "@/repositories/writingAnswers";
import { TPracticeDto } from "@/models/practice.model";
import { TaskRepository } from "@/repositories/tasks.repo";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { currentUser } from "@clerk/nextjs/server";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
async function withRetry<T>(
  fn: () => Promise<T>,
  config?: {
    retries?: number;
    baseDelayMs?: number;
    shouldRetry?: (e: Error) => boolean;
  }
): Promise<T> {
  const retries = config?.retries ?? 3;
  const baseDelayMs = config?.baseDelayMs ?? 300;
  const shouldRetry = config?.shouldRetry ?? (() => true);

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastErr = error;
      if (attempt === retries || !shouldRetry(error)) break;
      const jitter = Math.random() * 100;
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
      await sleep(delay);
    }
  }
  throw lastErr ?? new Error("Operation failed");
}

interface DeepgramAlternative {
  transcript: string;
}
interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}
interface DeepgramResults {
  channels: DeepgramChannel[];
}
interface DeepgramMetadata {
  duration: number;
}
interface DeepgramResponse {
  results: DeepgramResults;
  metadata: DeepgramMetadata;
}

// =============== Anthropic tool-use response types (subset used) ===============
interface AnthropicTextBlock {
  type: "text";
  text: string;
}
interface EvaluationInput {
  overall: number;
  contentAndCoherence: number;
  vocabulary: number;
  readabilityAndGrammar: number;
  taskFulfillment: number;
  feedback: string;
  betterVersion?: string;
  grammarMistakes: { original: string; improvement: string | null }[] | [];
}
interface AnthropicToolUseBlock {
  type: "tool_use";
  name: "CELPIPWritingEvaluation";
  input: EvaluationInput;
}
type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;
interface AnthropicResponse {
  content: AnthropicContentBlock[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// =============== Stored evaluation type  ===============
interface StoredEvaluation {
  overall: number;
  contentAndCoherence: number;
  vocabulary: number;
  readabilityAndGrammar: number;
  taskFulfillment: number;
  feedback: string;
  grammarMistakes: { original: string; improvement: string | null }[];
  betterVersion: string;
}
function toStoredEvaluation(e: EvaluationInput | null): StoredEvaluation {
  return {
    overall: e?.overall ?? 0,
    contentAndCoherence: e?.contentAndCoherence ?? 0,
    vocabulary: e?.vocabulary ?? 0,
    readabilityAndGrammar: e?.readabilityAndGrammar ?? 0,
    taskFulfillment: e?.taskFulfillment ?? 0,
    feedback: e?.feedback ?? "",
    betterVersion: e?.betterVersion ?? "",
    grammarMistakes: Array.isArray(e?.grammarMistakes)
      ? (
          e!.grammarMistakes as {
            original?: string;
            improvement?: string | null;
          }[]
        ).map((m) => ({
          original: m.original ?? "",
          improvement: m.improvement ?? null,
        }))
      : [],
  };
}

// =============== S3 upload ===============
async function uploadAudioBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string | null> {
  const client = new S3Client({
    region: "eu-north-1",
    credentials: {
      accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRETE_ACCESS_KEY ?? "",
    },
  });

  const upload = new Upload({
    client,
    params: {
      Bucket: "celtest-audio",
      Key: `RecordedSpeaking/${Date.now()}_${fileName}`,
      Body: buffer,
    },
  });

  try {
    const result = (await upload.done()) as CompleteMultipartUploadOutput;
    return result.Location ?? null;
  } catch (error) {
    console.error(
      "Upload failed" +
        process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID +
        " " +
        process.env.NEXT_PUBLIC_AWS_SECRETE_ACCESS_KEY,
      error
    );
    return null;
  }
}

// =============== Deepgram ===============
async function transcribeUrl(fileUrl: string): Promise<DeepgramResponse> {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY ?? "";
  const deepgram = createClient(deepgramApiKey);
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: fileUrl },
    { smart_format: true, model: "nova-3", language: "en-US" }
  );
  if (error) throw error;
  return result as DeepgramResponse;
}

// =============== Anthropic helpers ===============
function extractEvaluation(
  blocks: AnthropicContentBlock[]
): EvaluationInput | null {
  for (const b of blocks) {
    if (b.type === "tool_use" && b.name === "CELPIPWritingEvaluation") {
      return b.input;
    }
  }
  return null;
}

// ===== Off-topic helpers (from passages[].description) =====
const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const uniqLower = (arr: string[]) => {
  const seen = new Set<string>();
  return arr.filter((t) => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// =============== Route: POST ===============
export const POST = async function (req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!(audioFile instanceof File)) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // Retry: S3
    const location = await withRetry(
      () => uploadAudioBuffer(buffer, "recording.m4a"),
      {
        retries: 3,
        shouldRetry: (e) =>
          /ECONNRESET|ETIMEDOUT|Throttling|5\d\d/i.test(e.message),
      }
    );
    if (!location) {
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 400 }
      );
    }

    // Retry: Deepgram
    const transcribeResult = await withRetry(() => transcribeUrl(location), {
      retries: 3,
      shouldRetry: (e) => /ECONNRESET|ETIMEDOUT/i.test(e.message),
    });

    const practiceRepo = new PracticeRepository(mongoClient);
    const practiceIdRaw = formData.get("practiceId");
    if (typeof practiceIdRaw !== "string" || practiceIdRaw.length === 0) {
      return NextResponse.json(
        { message: "Practice ID is required" },
        { status: 400 }
      );
    }
    const practiceId = practiceIdRaw;

    const practice: TPracticeDto | null = await practiceRepo.findPractice(
      practiceId
    );
    if (!practice || practice.taskId === undefined) {
      return NextResponse.json(
        { message: "Practice not found" },
        { status: 404 }
      );
    }

    const taskRepo = new TaskRepository(mongoClient);
    const task: TTaskSchemaDto | null = await taskRepo.findTaskById(
      practice.taskId ?? ""
    );
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const commandTemplate = task.antropicCommand?.userPrompt ?? "";
    if (commandTemplate.length === 0) {
      return NextResponse.json(
        { error: "Missing userPrompt" },
        { status: 400 }
      );
    }
    const speakingPrompt = practice.passages?.[0]?.body ?? "";
    if (!speakingPrompt) {
      return NextResponse.json(
        { error: "Missing speaking prompt" },
        { status: 400 }
      );
    }

    const alt = transcribeResult.results.channels[0]?.alternatives[0];
    const userAnswer = alt ? alt.transcript : "";

    let command = commandTemplate;

    // Inject user answer
    if (command.includes("{{USER_RESPONSE}}")) {
      command = command.replaceAll("{{USER_RESPONSE}}", userAnswer);
    } else if (command.includes("{{SPOKEN_RESPONSE}}")) {
      command = command.replaceAll("{{SPOKEN_RESPONSE}}", userAnswer);
    }

    // Inject speaking prompt / scene
    if (command.includes("{{SPEAKING_PROMPT}}")) {
      command = command.replaceAll("{{SPEAKING_PROMPT}}", speakingPrompt);
    } else if (command.includes("{{PROMPT}}")) {
      command = command.replaceAll("{{PROMPT}}", speakingPrompt);
    } else if (command.includes("{{SCENE_DESCRIPTION}}")) {
      const scene = practice.passages?.[1]?.body ?? "";
      command = command.replaceAll("{{SCENE_DESCRIPTION}}", scene);
    }

    // Inject duration
    const durationStr = String(transcribeResult.metadata.duration);
    if (command.includes("{{SPEAKING_DURATION}}")) {
      command = command.replaceAll("{{SPEAKING_DURATION}}", durationStr);
    }

    // ===== Off-topic from ALL passages[].description =====
    const topics = uniqLower(
      (practice.passages ?? [])
        .map((p: any) => stripHtml((p?.description ?? p?.body).toString()))

        .filter(Boolean)
    );

    // Build/augment final system prompt
    let finalSystemPrompt = (task.antropicCommand?.systemPrompt ?? "").trim();

    if (topics.length) {
      const inlineTopics = topics.join(" | ");
      const hasTD = command.includes("{{TASK_DESCRIPTION}}");
      const hasTOPIC = command.includes("{{TOPIC}}");

      if (hasTD || hasTOPIC) {
        command = command
          .replaceAll("{{TASK_DESCRIPTION}}", inlineTopics)
          .replaceAll("{{TOPIC}}", inlineTopics);
      } else {
        const marker = "\n---\nTASK_TOPICS:";
        if (!command.includes(marker)) {
          const bulletTopics = topics.map((t) => `- ${t}`).join("\n");
          command += `

---
TASK_TOPICS:
${bulletTopics}

SCORING_RULES_FOR_TASK_FULFILLMENT:
- Heavily penalize off-topic responses.
- The response must meaningfully address at least ONE of the TASK_TOPICS above.
- If it doesn't address any, set "taskFulfillment" very low (e.g., 0–3/12) and reflect this in "overall".
- Do NOT reward fluency or grammar with high "overall" if the response is off-topic.`;
        }
      }

      const bulletForSystem = topics.map((t) => `- ${t}`).join("\n");
      finalSystemPrompt += `

The user must address at least ONE of the following TASK_TOPICS:
${bulletForSystem}

If the response is off-topic (i.e., does not address any topic above), sharply reduce "taskFulfillment" and lower "overall" accordingly.`;
    }

    // Call OpenRouter API with tool calling
    const openRouterResponse = await withRetry(
      () =>
        fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://celpippracticetest.com",
            "X-Title": "CELPIP Practice Test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 20000,
            temperature: 1,
            messages: [
              {
                role: "system",
                content: finalSystemPrompt,
              },
              {
                role: "user",
                content: command,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "CELPIPWritingEvaluation",
                  description:
                    "evaluating and providing feedback on a speaking sample and content analysis scores",
                  parameters: {
                    type: "object",
                    properties: {
                      overall: {
                        type: "number",
                        description: "Overall Score: (out of 12)",
                      },
                      contentAndCoherence: {
                        type: "number",
                        description: "Content & Coherence: (out of 12)",
                      },
                      vocabulary: {
                        type: "number",
                        description: "Vocabulary: (out of 12)",
                      },
                      readabilityAndGrammar: {
                        type: "number",
                        description: "Vocabulary: (out of 12)",
                      },
                      taskFulfillment: {
                        type: "number",
                        description:
                          "Task Fulfillment: (out of 12). Strictly tied to TASK_TOPICS; off-topic => low score.",
                      },
                      feedback: {
                        type: "string",
                        description: task.antropicCommand?.systemPrompt ?? "",
                      },
                      grammarMistakes: {
                        type: "array",
                        description:
                          "a list of grammar or vocabulary mistakes and the correct way for that mistake, build an array that consist all part of provided text, each part should consist original and improve part and if that part doesnt need improvement it should set null for improvement but original part should has value.",
                        items: {
                          type: "object",
                          properties: {
                            original: { type: "string" },
                            improvement: { type: ["string", "null"] },
                          },
                        },
                      },
                      betterVersion: {
                        type: "string",
                        description:
                          "write a better version of this answer with all suggestion and improvement",
                      },
                    },
                    required: [
                      "overall",
                      "contentAndCoherence",
                      "vocabulary",
                      "readabilityAndGrammar",
                      "taskFulfillment",
                      "feedback",
                      "grammarMistakes",
                    ],
                  },
                },
              },
            ],
            tool_choice: "auto",
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            console.error("OpenRouter API error:", errorData);
            throw new Error(`OpenRouter API failed: ${res.status}`);
          }
          return res.json();
        }),
      {
        retries: 3,
        shouldRetry: (e) => /429|5\d\d|ETIMEDOUT|ECONNRESET/i.test(e.message),
      }
    );

    // Extract tool call result
    const toolCall = openRouterResponse.choices?.[0]?.message?.tool_calls?.[0];
    const msg: AnthropicResponse = {
      content: [
        {
          type: "text",
          text: openRouterResponse.choices?.[0]?.message?.content || "",
        },
        {
          type: "tool_use",
          name: "CELPIPWritingEvaluation",
          input: toolCall?.function?.arguments
            ? JSON.parse(toolCall.function.arguments)
            : {},
        },
      ] as AnthropicContentBlock[],
      usage: {
        input_tokens: openRouterResponse.usage?.prompt_tokens || 0,
        output_tokens: openRouterResponse.usage?.completion_tokens || 0,
      },
    };

    const evaluation = extractEvaluation(msg.content);
    const stored = toStoredEvaluation(evaluation);

    const answerRepo = new WritingAnswerRepository(mongoClient);
    const answer = await answerRepo.createOrUpdateAnswer({
      audioUrl: location,
      userId: user.id,
      practiceId,
      overalScore: stored.overall,
      type: "SPEAKING",
      result: stored,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      ...answer,
      usage: {
        prompt_tokens: msg?.usage?.input_tokens || 0,
        completion_tokens: msg?.usage?.output_tokens || 0,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error uploading/transcribing/evaluating:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
};

// =============== Route: GET ===============
export const GET = async function (req: NextRequest) {
  const practiceId = req.nextUrl.searchParams.get("practiceId");
  if (!practiceId) {
    return NextResponse.json(
      { message: "Practice ID is required" },
      { status: 400 }
    );
  }
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const answerRepo = new WritingAnswerRepository(mongoClient);
  const answers = await answerRepo.getAllWritingAnswers(
    { userId: user.id, practiceId, type: "SPEAKING" },
    0,
    100
  );
  return NextResponse.json(answers);
};
