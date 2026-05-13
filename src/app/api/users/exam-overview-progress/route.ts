import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import { buildExamProgressById } from "@/lib/examOverviewProgress";
import documentsClient from "@/lib/appDocumentsClient";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";

const MAX_EXAM_IDS = 500;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const examIdsRaw = (body as { examIds?: unknown })?.examIds;
  if (!Array.isArray(examIdsRaw)) {
    return NextResponse.json({ error: "examIds must be an array" }, { status: 400 });
  }

  const examIds = [...new Set(examIdsRaw.map((id) => String(id)).filter(Boolean))];
  if (examIds.length === 0) {
    return NextResponse.json({ examProgressById: {} });
  }
  if (examIds.length > MAX_EXAM_IDS) {
    return NextResponse.json(
      { error: `At most ${MAX_EXAM_IDS} exam ids allowed` },
      { status: 400 }
    );
  }

  try {
    const examPartsRepo = new ExamPartsRepository(documentsClient);
    const listeningAndReadingAnswerRepo = new ListeningAndReadingAnswerRepository(
      documentsClient
    );

    const [examPartCountsById, partitioned] = await Promise.all([
      examPartsRepo.countPartsByExamIds(examIds),
      listeningAndReadingAnswerRepo.getPartitionedMockExamProgressAnswers(
        userId,
        examIds
      ),
    ]);

    const examProgressById = buildExamProgressById({
      examIds,
      examPartCountsById,
      listeningAndReadingAnswers: partitioned.listeningAndReading.filter((a) =>
        Boolean(a.examId)
      ),
      writingAndSpeakingAnswers: partitioned.writingAndSpeaking.filter((a) =>
        Boolean(a.examId)
      ),
    });

    return NextResponse.json({ examProgressById });
  } catch (e) {
    console.error("[exam-overview-progress]", e);
    return NextResponse.json(
      { error: "Failed to load exam progress" },
      { status: 500 }
    );
  }
}
