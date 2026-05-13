import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import documentsClient from "@/lib/appDocumentsClient";
import { ObjectId } from "bson";
import { PracticeDtoSchema } from "@/models/practice.model";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { ExamPartSchemaDto } from "@/models/examParts.model";

export async function GET(req: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const examPartRepo = new ExamPartsRepository(documentsClient);
  const practice = await examPartRepo.findById(examId);
  return NextResponse.json({ item: practice }, { status: 200 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const examPartRepo = new ExamPartsRepository(documentsClient);
  await examPartRepo.deletePractice(examId);
  return NextResponse.json({ status: 200 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const body = await req.json();
  const practiceParser = ExamPartSchemaDto.omit({ id: true }).safeParse({...body, partId: parseInt(body.partId)});

  if (practiceParser.success) {
    const examPartRepo = new ExamPartsRepository(documentsClient);
    const examDto = await examPartRepo.updateExam(examId, practiceParser.data);
    return NextResponse.json({ ...examDto }, { status: 200 });
  } else {
    return NextResponse.json({ message: practiceParser.error }, { status: 400 });
  }
}
