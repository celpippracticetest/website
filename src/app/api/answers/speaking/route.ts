import { NextRequest, NextResponse } from "next/server";
import documentsClient from "@/lib/appDocumentsClient";
import { createClient } from "@deepgram/sdk";
import { uploadAudioBuffer } from "@/lib/s3-client";
import { PracticeRepository } from "@/repositories/practice.repo";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { TPracticeDto } from "@/models/practice.model";
import { TaskRepository } from "@/repositories/tasks.repo";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import {
  OPENROUTER_EVAL_MAX_TOKENS,
  OPENROUTER_EVAL_PROVIDER,
  OPENROUTER_EVAL_TEMPERATURE,
  resolveOpenRouterEvalModel,
} from "@/lib/openrouterEvaluation";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const [authContext, formData] = await Promise.all([
      getAuthenticatedRequestContext(req),
      req.formData(),
    ]);
    const user = authContext?.user;
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
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

    const practiceRepo = new PracticeRepository(documentsClient);
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

    const taskRepo = new TaskRepository(documentsClient);
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

    // Determine which model to use
    const modelToUse = resolveOpenRouterEvalModel();

    // Enhance system prompt for models that don't support tool calling well
    const isQwen = modelToUse?.includes('qwen');
    if (isQwen) {
      finalSystemPrompt += `

CRITICAL SCORING RULES:
- MUST call CELPIPWritingEvaluation function
- BE STRICT: 12/12 = PERFECT (zero mistakes). ONE error = max 11/12
- OFF-TOPIC = taskFulfillment 0-3/12, overall max 5/12
- TOO SHORT = reduce all by 2-3 points
- Average responses = 7-9/12, NOT 10-12
- ALWAYS provide betterVersion (if off-topic, write NEW correct response)

Scale: 12=Perfect | 10-11=Excellent | 8-9=Good | 6-7=Adequate | 4-5=Weak | 1-3=Poor`;
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
            model: modelToUse,
            max_tokens: OPENROUTER_EVAL_MAX_TOKENS,
            temperature: OPENROUTER_EVAL_TEMPERATURE,
            provider: OPENROUTER_EVAL_PROVIDER,
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
                      "betterVersion",
                    ],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "CELPIPWritingEvaluation" } },
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
    
    if (!toolCall) {
      console.error("No tool call! Full response:", JSON.stringify(openRouterResponse, null, 2));
      
      // Fallback: Try to parse structured content from message
      const messageContent = openRouterResponse.choices?.[0]?.message?.content || "";
      let parsedResult: any = null;
      
      // Strategy 1: Try direct JSON parse
      try {
        parsedResult = JSON.parse(messageContent);
      } catch {
        // Strategy 2: Try to find JSON in markdown code blocks
        const jsonMatch = messageContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[1]);
          } catch (e) {
            console.error("Failed to parse JSON from code block", e);
          }
        }
      }
      
      if (!parsedResult || typeof parsedResult !== 'object') {
        console.error("All parsing strategies failed!");
        throw new Error(
          `This model does not support tool calling properly. Please use a different model (e.g., Claude). Provider: ${openRouterResponse.provider}, Model: ${openRouterResponse.model}`
        );
      }
      
      // Validate that all required fields exist - NO DEFAULTS!
      const requiredFields = [
        'overall', 'contentAndCoherence', 'vocabulary', 
        'readabilityAndGrammar', 'taskFulfillment', 'feedback', 
        'grammarMistakes', 'betterVersion'
      ];
      
      const missingFields = requiredFields.filter(field => 
        parsedResult[field] === undefined || parsedResult[field] === null
      );
      
      if (missingFields.length > 0) {
        console.error("Missing required fields:", missingFields);
        throw new Error(
          `Model returned incomplete data. Missing fields: ${missingFields.join(', ')}. Please use Claude instead of ${openRouterResponse.model}`
        );
      }
      
      // Validate betterVersion is not empty
      if (!parsedResult.betterVersion || parsedResult.betterVersion.trim().length < 50) {
        console.error("betterVersion is empty or too short");
        throw new Error(
          `Model did not provide proper betterVersion (must be at least 50 characters). Please use Claude instead of ${openRouterResponse.model}`
        );
      }
      
      console.log("Successfully extracted complete data from content");
      
      const answerRepo = new WritingAndSpeakingAnswerRepository(documentsClient);
      const answer = await answerRepo.createOrUpdateAnswer({
        audioUrl: location,
        userId: user.id,
        practiceId,
        overalScore: parsedResult.overall,
        type: "SPEAKING",
        result: parsedResult,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({
        ...answer,
        usage: {
          prompt_tokens: openRouterResponse.usage?.prompt_tokens || 0,
          completion_tokens: openRouterResponse.usage?.completion_tokens || 0,
        },
      });
    }
    
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
    
    if (!evaluation) {
      throw new Error("Failed to extract evaluation from tool call response");
    }
    
    // Validate betterVersion is not empty
    if (!evaluation.betterVersion || evaluation.betterVersion.trim().length < 50) {
      console.error("betterVersion is missing or too short");
      throw new Error(
        `Model did not provide proper betterVersion (must be at least 50 characters). Please use Claude instead of ${openRouterResponse.model}`
      );
    }
    
    const stored = toStoredEvaluation(evaluation);

    const answerRepo = new WritingAndSpeakingAnswerRepository(documentsClient);
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
  const authContext = await getAuthenticatedRequestContext(req);
  const user = authContext?.user;
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const answerRepo = new WritingAndSpeakingAnswerRepository(documentsClient);
  const answers = await answerRepo.getAllWritingAnswers(
    { userId: user.id, practiceId, type: "SPEAKING" },
    0,
    100
  );
  return NextResponse.json(answers);
};
