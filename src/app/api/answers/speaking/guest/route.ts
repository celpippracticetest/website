import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import documentsClient from "@/lib/appDocumentsClient";
import { uploadAudioBuffer } from "@/lib/s3-client";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { evaluateSpeakingSubmission } from "@/lib/speakingEvaluationService";

export const runtime = "nodejs";
export const maxDuration = 60;

const GUEST_TRIAL_COOKIE = "guest_speaking_trial_used";

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

async function transcribeUrl(fileUrl: string) {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY ?? "";
  const deepgram = createClient(deepgramApiKey);
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: fileUrl },
    { smart_format: true, model: "nova-3", language: "en-US" }
  );
  if (error) throw error;
  return result;
}

export async function POST(req: NextRequest) {
  try {
    if (req.cookies.get(GUEST_TRIAL_COOKIE)?.value === "1") {
      return NextResponse.json(
        {
          message:
            "Your free speaking trial is used. Sign up for a free account to save results and unlock more practice.",
        },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!(audioFile instanceof File)) {
      return NextResponse.json(
        { message: "Audio file is required" },
        { status: 400 }
      );
    }

    const practiceIdRaw = formData.get("practiceId");
    if (typeof practiceIdRaw !== "string" || practiceIdRaw.length === 0) {
      return NextResponse.json(
        { message: "Practice ID is required" },
        { status: 400 }
      );
    }

    const practiceRepo = new PracticeRepository(documentsClient);
    const practice = await practiceRepo.findPractice(practiceIdRaw);
    if (!practice?.taskId) {
      return NextResponse.json({ message: "Practice not found" }, { status: 404 });
    }
    if (!practice.isFree) {
      return NextResponse.json(
        { message: "Free trial is only available on free speaking practices." },
        { status: 403 }
      );
    }

    const taskRepo = new TaskRepository(documentsClient);
    const task = await taskRepo.findTaskById(practice.taskId);
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
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
        { message: "Failed to upload audio file" },
        { status: 400 }
      );
    }

    const transcribeResult = await withRetry(() => transcribeUrl(location), {
      retries: 3,
      shouldRetry: (e) => /ECONNRESET|ETIMEDOUT/i.test(e.message),
    });

    const alt = transcribeResult.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alt?.transcript ?? "";
    const durationSeconds = transcribeResult.metadata?.duration ?? 0;

    const { result, usage } = await evaluateSpeakingSubmission({
      task,
      practice,
      transcript,
      durationSeconds,
    });

    const response = NextResponse.json({
      id: `guest_${practiceIdRaw}_${Date.now()}`,
      audioUrl: location,
      practiceId: practiceIdRaw,
      type: "SPEAKING",
      overalScore: result.overall,
      overall: result.overall,
      result,
      transcript,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGuestTrial: true,
      usage: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
      },
    });

    response.cookies.set(GUEST_TRIAL_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("POST /api/answers/speaking/guest failed:", error);
    return NextResponse.json(
      { message: "Failed to evaluate speaking. Please try again." },
      { status: 500 }
    );
  }
}
