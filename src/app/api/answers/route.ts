import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { ListeningAndReadingAnswerSchemaRequest } from "@/models/answer";

import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { TPracticeDto } from "@/models/practice.model";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";

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
    const totalQuestions = practice.questions?.length || 1;
    const correctAnswers = Object.values(parseResult.data.answers || {}).filter(
      (answer: any) => answer && answer.isCorrect
    ).length;
    const overall = Math.round((correctAnswers / totalQuestions) * 100);
    
    return NextResponse.json({ 
      result: createdAnswer,
      overall: overall
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
