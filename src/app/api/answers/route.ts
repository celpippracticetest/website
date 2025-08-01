import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { ListeningAndReadingAnswerSchemaRequest } from "@/models/answer";

import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { TPracticeDto } from "@/models/practice.model";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parseResult = ListeningAndReadingAnswerSchemaRequest.safeParse(body);

  if (parseResult.success) {
    const user = await currentUser();
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
    return NextResponse.json({ result: createdAnswer });
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
  const userId = searchParams.get("userId");
  const type = searchParams.get("type");

  if (!practiceId || !userId || !type) {
    return NextResponse.json(
      { message: "Missing required query parameters" },
      { status: 400 }
    );
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
