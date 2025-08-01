import mongoClient from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { ExamPartSchemaDto } from "@/models/examParts.model";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const practiceParser = ExamPartSchemaDto.omit({ id: true }).safeParse({...body, partId: parseInt(body.partId)});

  if (practiceParser.success) {
    const practiceRepo = new ExamPartsRepository(mongoClient);
    const practiceDto = await practiceRepo.createExamPart(practiceParser.data);
    return NextResponse.json({ id: practiceDto.id }, { status: 200 });
  } else {
    return NextResponse.json({ message: practiceParser.error }, { status: 400 });
  }
}

export const GET = async function (req: NextRequest) {
  const partId: string | null = req.nextUrl.searchParams.get("partId");
  const page: string = req.nextUrl.searchParams.get("page") ?? "0";
  const limit: string = req.nextUrl.searchParams.get("limit") ?? "10";
  const examId: string | null = req.nextUrl.searchParams.get("examId");
  const filter: Record<string, any> = {};
  if(examId){
    filter['examId'] = new ObjectId(examId) ;

  }
  if(partId){
    filter['partId'] = parseInt(partId);

  }
  const practiceRepo = new ExamPartsRepository(mongoClient);
  const practices = await practiceRepo.getAllExamPart(
    filter,
    parseInt(page),
    parseInt(limit)
  );
  return NextResponse.json({ ...practices, filters: { partId, examId } }, { status: 200 });
};
