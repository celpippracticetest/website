import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { ListeningAndReadingAnswerSchemaRequest } from "@/models/answer";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { TExamPartSchemaDto } from "@/models/examParts.model";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parseResult = ListeningAndReadingAnswerSchemaRequest.safeParse(body);

  if (parseResult.success) {
    const authContext = await getAuthenticatedRequestContext(req);
    if (!authContext?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const user = authContext.user;
    if (!parseResult.data.examId || !parseResult.data.partId) {
      return NextResponse.json({ message: "exam id or part id is missing" }, { status: 400 });
    }
    const examPartsRepo = new ExamPartsRepository(mongoClient);
    const examPart: TExamPartSchemaDto | null = await examPartsRepo.findExamPartByExamIdAndPartId(parseResult.data.examId, parseResult.data.partId);
    if (!examPart) {
      return NextResponse.json({ message: "examPart not found" }, { status: 404 });
    }
    const answerRepo = new ListeningAndReadingAnswerRepository(mongoClient);
    const createdAnswer = await answerRepo.createOrUpdateAnswer({
      ...parseResult.data,
      userId: user.id,
      type: examPart.type,
      examId: examPart.examId.toString(),
      partId: examPart.partId,
      attemptId: parseResult.data.attemptId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return NextResponse.json({ result: createdAnswer });
  } else {
    return NextResponse.json({ message: parseResult.error.errors }, { status: 400 });
  }
}
