import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import documentsClient from "@/lib/appDocumentsClient";
import { WritingAnswerRequestSchema } from "@/models/answer";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { evaluateWritingSubmission } from "@/lib/writingEvaluationService";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = async function (req: NextRequest) {
  const [body, authContext] = await Promise.all([
    req.json(),
    getAuthenticatedRequestContext(req),
  ]);
  const answersParser = WritingAnswerRequestSchema.safeParse(body);
  const user = authContext?.user;
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (answersParser.success) {
    const answerBody = answersParser.data;
    const answerRepo = new WritingAndSpeakingAnswerRepository(documentsClient);
    if (!answerBody.practiceId) {
      return NextResponse.json(
        { message: "Practice id didnt provide." },
        { status: 400 }
      );
    }
    const practiceRepo = new PracticeRepository(documentsClient);
    const taskRepo = new TaskRepository(documentsClient);
    const practice = await practiceRepo.findPractice(answerBody.practiceId);
    if (!practice || practice.taskId === undefined) {
      return NextResponse.json(
        { message: "Practice not found" },
        { status: 404 }
      );
    }

    if (
      !hasPaidPracticeAccess(
        user.publicMetadata.plan as string | undefined,
        user.publicMetadata.purchaseDate as string | undefined
      )
    ) {
      if (!practice.isFree) {
        return NextResponse.json(
          { message: "Subscribe to submit writing on this practice." },
          { status: 403 }
        );
      }
      const allWriting = await answerRepo.getAllWritingAnswers(
        { userId: user.id, type: "WRITING" },
        0,
        1
      );
      if (allWriting.totalItems >= 1) {
        return NextResponse.json(
          { message: "You havent any free credit." },
          { status: 400 }
        );
      }
    }

    const task: TTaskSchemaDto | null = await taskRepo.findTaskById(
      practice.taskId ?? ""
    );
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const { result: parsedResult, usage } = await evaluateWritingSubmission({
      task,
      practice,
      text: answerBody.text,
    });

    const answer = await answerRepo.createAnswer({
      text: answerBody.text,
      userId: user?.id,
      practiceId: answerBody.practiceId,
      overalScore: parsedResult.overall,
      type: "WRITING",
      result: parsedResult,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return NextResponse.json({
      ...answer,
      usage: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
      },
    });
  } else {
    return NextResponse.json({ message: answersParser.error }, { status: 400 });
  }
};

export const GET = async function (req: NextRequest) {
  try {
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
      { userId: user.id, practiceId, type: "WRITING" },
      0,
      100
    );
    return NextResponse.json(answers);
  } catch (error) {
    console.error("GET /api/answers/writing failed:", error);
    return NextResponse.json(
      {
        message: "Failed to load answers",
        items: [],
        hasNextPage: false,
        page: 1,
        totalPages: 0,
        totalItems: 0,
      },
      { status: 500 }
    );
  }
};
