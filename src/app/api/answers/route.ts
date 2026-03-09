import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { ListeningAndReadingAnswerSchemaRequest } from "@/models/answer";

import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { TPracticeDto } from "@/models/practice.model";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";

function flattenPracticeQuestions(practice: TPracticeDto) {
  return practice.passages.flatMap((passage) => passage.questions ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parseResult = ListeningAndReadingAnswerSchemaRequest.safeParse(body);

  if (parseResult.success) {
    const authContext = await getAuthenticatedRequestContext(req);
    const user = authContext?.user;
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!parseResult.data.practiceId) {
      return NextResponse.json(
        { message: "Practice id is missing" },
        { status: 400 }
      );
    }
    const practiceRepo = new PracticeRepository(mongoClient);
    const practice: TPracticeDto | null = await practiceRepo.findPractice(
      parseResult.data.practiceId
    );
    if (!practice) {
      return NextResponse.json(
        { message: "Practice not found" },
        { status: 404 }
      );
    }
    const answerRepo = new ListeningAndReadingAnswerRepository(mongoClient);
    const createdAnswer = await answerRepo.createOrUpdateAnswer({
      ...parseResult.data,
      userId: user.id,
      type: practice.type,
      taskId: practice.taskId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Calculate overall score for league points system
    const questions = flattenPracticeQuestions(practice);
    const totalQuestions = questions.length || 1;
    const correctAnswers = questions.reduce((count, question, index) => {
      const submittedAnswer =
        parseResult.data.answers[question.id] ??
        parseResult.data.answers[index.toString()];

      if (submittedAnswer && submittedAnswer === question.answer) {
        return count + 1;
      }

      return count;
    }, 0);
    const overall = Math.round((correctAnswers / totalQuestions) * 100);

    return NextResponse.json({
      result: createdAnswer,
      overall: overall,
    });
  } else {
    return NextResponse.json(
      { message: parseResult.error.errors },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const practiceId = searchParams.get("practiceId");
  const type = searchParams.get("type");

  if (!practiceId || !type) {
    return NextResponse.json(
      { message: "Missing required query parameters" },
      { status: 400 }
    );
  }

  const authContext = await getAuthenticatedRequestContext(req);
  const userId = authContext?.userId;
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const answerRepo = new ListeningAndReadingAnswerRepository(mongoClient);
  const answer = await answerRepo.findAnswerByPracticeAndUser(
    practiceId,
    userId
  );

  if (!answer) {
    return NextResponse.json({ message: "Answer not found" }, { status: 404 });
  }

  return NextResponse.json({ answers: answer.answers });
}
