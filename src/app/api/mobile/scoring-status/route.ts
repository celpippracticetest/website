import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";

export async function GET(request: NextRequest) {
  const authContext = await getAuthenticatedRequestContext(request);
  if (!authContext?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const practiceId = request.nextUrl.searchParams.get("practiceId");
  const type = request.nextUrl.searchParams.get("type")?.toUpperCase();

  if (!practiceId || (type !== "WRITING" && type !== "SPEAKING")) {
    return NextResponse.json(
      { error: "practiceId and valid type are required" },
      { status: 400 }
    );
  }

  const answerRepo = new WritingAndSpeakingAnswerRepository(mongoClient);
  const answers = await answerRepo.getAllWritingAnswers(
    {
      userId: authContext.userId,
      practiceId,
      type: type as "WRITING" | "SPEAKING",
    },
    0,
    10
  );

  const latestAnswer = answers.items.isNotEmpty ? answers.items.first : null;

  return NextResponse.json({
    status: latestAnswer ? "ready" : "pending",
    item: latestAnswer,
  });
}
