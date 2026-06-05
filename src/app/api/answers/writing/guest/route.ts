import { NextRequest, NextResponse } from "next/server";
import documentsClient from "@/lib/appDocumentsClient";
import { WritingAnswerRequestSchema } from "@/models/answer";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { evaluateWritingSubmission } from "@/lib/writingEvaluationService";

export const runtime = "nodejs";
export const maxDuration = 60;

const GUEST_TRIAL_COOKIE = "guest_writing_trial_used";

export async function POST(req: NextRequest) {
  try {
    if (req.cookies.get(GUEST_TRIAL_COOKIE)?.value === "1") {
      return NextResponse.json(
        {
          message:
            "Your free writing trial is used. Sign up for a free account to save results and unlock more practice.",
        },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }

    const parsed = WritingAnswerRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
    }

    const { practiceId, text } = parsed.data;
    if (!practiceId) {
      return NextResponse.json(
        { message: "Practice id is required." },
        { status: 400 }
      );
    }

    const practiceRepo = new PracticeRepository(documentsClient);
    const taskRepo = new TaskRepository(documentsClient);
    const practice = await practiceRepo.findPractice(practiceId);
    if (!practice?.taskId) {
      return NextResponse.json({ message: "Practice not found" }, { status: 404 });
    }
    if (!practice.isFree) {
      return NextResponse.json(
        { message: "Free trial is only available on free writing practices." },
        { status: 403 }
      );
    }

    const task = await taskRepo.findTaskById(practice.taskId);
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const { result, usage } = await evaluateWritingSubmission({
      task,
      practice,
      text,
    });

    const response = NextResponse.json({
      id: `guest_${practiceId}_${Date.now()}`,
      text,
      practiceId,
      type: "WRITING",
      overalScore: result.overall,
      overall: result.overall,
      result,
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
    console.error("POST /api/answers/writing/guest failed:", error);
    return NextResponse.json(
      { message: "Failed to evaluate writing. Please try again." },
      { status: 500 }
    );
  }
}
