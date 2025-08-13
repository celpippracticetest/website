import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import {
  S3Client,
  type CompleteMultipartUploadOutput,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createClient } from "@deepgram/sdk";
import Anthropic from "@anthropic-ai/sdk";
import { WritingAnswerRepository } from "@/repositories/writingAnswers";
import { currentUser } from "@clerk/nextjs/server";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { USER_PROMPTS } from "./userPrompts";
import { SYSTEM_PROPMTS } from "./systemPrompts";

// =============== Retry Helper ===============
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

// =============== S3 Upload ===============
async function uploadAudioBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string | null> {
  const client = new S3Client({
    region: "eu-north-1",
    credentials: {
      accessKeyId:
        process.env.AWS_ACCESS_KEY_ID ??
        process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ??
        "",
      secretAccessKey:
        process.env.AWS_SECRET_ACCESS_KEY ??
        process.env.NEXT_PUBLIC_AWS_SECRETE_ACCESS_KEY ??
        "",
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
    console.error("Upload failed", error);
    return null;
  }
}

// =============== Deepgram ===============
async function transcribeUrl(fileUrl: string): Promise<any> {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY ?? "";
  const deepgram = createClient(deepgramApiKey);
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: fileUrl },
    { smart_format: true, model: "nova-3", language: "en-US" }
  );
  if (error) throw error;
  return result;
}

// =============== POST Route ===============
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

    const examPartRepo = new ExamPartsRepository(mongoClient);
    const examId = formData.get("examId") as string;
    const partId = formData.get("partId") as string;

    const examPart = await examPartRepo.findExamPartByExamIdAndPartId(
      examId,
      parseInt(partId)
    );
    if (!examPart || examPart.examId === undefined) {
      return NextResponse.json({ message: "exam not found" }, { status: 404 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let command = USER_PROMPTS[parseInt(partId)];
    const userAnswer =
      transcribeResult.results.channels[0]?.alternatives[0]?.transcript ?? "";

    // Replace placeholders
    command = command
      .replace("{{USER_RESPONSE}}", userAnswer)
      .replace("{{SPEAKING_RESPONSE}}", userAnswer)
      .replace("{{SPOKEN_RESPONSE}}", userAnswer)
      .replace("{{SPEAKING_PROMPT}}", examPart.passages?.[0]?.body ?? "")
      .replace("{{PROMPT}}", examPart.passages?.[0]?.body ?? "")
      .replace("{{SCENE_DESCRIPTION}}", examPart.passages?.[1]?.body ?? "")
      .replace(
        "{{SPEAKING_DURATION}}",
        String(transcribeResult.metadata?.duration ?? "60")
      );

    // Off-topic rules (exam?.description)
    const taskTopic = (examPart.exam?.description ?? "").trim();
    if (taskTopic) {
      const hasTD = command.includes("{{TASK_DESCRIPTION}}");
      const hasTOPIC = command.includes("{{TOPIC}}");

      if (hasTD || hasTOPIC) {
        command = command
          .replaceAll("{{TASK_DESCRIPTION}}", taskTopic)
          .replaceAll("{{TOPIC}}", taskTopic);
      } else {
        const marker = "\n---\nTASK_TOPIC:";
        if (!command.includes(marker)) {
          const appendix = `

---
TASK_TOPIC:
${taskTopic}

SCORING_RULES_FOR_TASK_FULFILLMENT:
- Heavily penalize off-topic responses.
- If the response does not meaningfully address TASK_TOPIC, set "taskFulfillment" very low (e.g., 0–3/12) and reflect this in "overall".
- Do NOT reward fluency or grammar with high "overall" if the response is off-topic.`;
          command += appendix;
        }
      }
    }

    const finalSystemPrompt =
      SYSTEM_PROPMTS[parseInt(partId)] +
      (taskTopic
        ? `

The user must address the following topic:
"${taskTopic}"

If the response is off-topic, sharply reduce "taskFulfillment" and lower "overall" accordingly.`
        : "");

    // Retry: Anthropic
    const msg: any = await withRetry(
      () =>
        anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 20000,
          temperature: 1,
          system: finalSystemPrompt,
          tools: [
            {
              name: "CELPIPWritingEvaluation",
              description:
                "evaluating and providing feedback on a speaking sample and content analysis scores",
              input_schema: {
                type: "object",
                properties: {
                  overall: { type: "number" },
                  contentAndCoherence: { type: "number" },
                  vocabulary: { type: "number" },
                  readabilityAndGrammar: { type: "number" },
                  taskFulfillment: { type: "number" },
                  feedback: { type: "string" },
                  grammarMistakes: { type: "array" },
                  betterVersion: { type: "string" },
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
          ],
          messages: [
            { role: "user", content: [{ type: "text", text: command }] },
          ],
        }),
      {
        retries: 3,
        shouldRetry: (e) => /429|5\d\d|ETIMEDOUT|ECONNRESET/i.test(e.message),
      }
    );

    const contentInput =
      msg.content.find(
        (item: any) => item.input && typeof item.input === "object"
      )?.input ?? null;

    const answerRepo = new WritingAnswerRepository(mongoClient);
    const answer = await answerRepo.createOrUpdateAnswer({
      audioUrl: location,
      userId: user.id,
      examId: examPart.examId,
      partId: examPart.partId,
      overalScore: contentInput?.overall ?? 0,
      type: "SPEAKING",
      result: contentInput ?? {
        overall: 0,
        contentAndCoherence: 0,
        vocabulary: 0,
        readabilityAndGrammar: 0,
        taskFulfillment: 0,
        feedback: "",
        betterVersion: "",
        grammarMistakes: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(answer);
  } catch (error) {
    console.error("Error uploading/transcribing/evaluating:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
};

// =============== GET Route ===============
export const GET = async function (req: NextRequest) {
  const examId = req.nextUrl.searchParams.get("examId");
  const partId = req.nextUrl.searchParams.get("partId");
  if (!examId) {
    return NextResponse.json(
      { message: "exam ID is required" },
      { status: 400 }
    );
  }
  if (!partId) {
    return NextResponse.json(
      { message: "part ID is required" },
      { status: 400 }
    );
  }
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const answerRepo = new WritingAnswerRepository(mongoClient);
  const answers = await answerRepo.getAllWritingAnswers(
    { userId: user.id, examId, partId: parseInt(partId), type: "SPEAKING" },
    0,
    100
  );
  return NextResponse.json(answers);
};
