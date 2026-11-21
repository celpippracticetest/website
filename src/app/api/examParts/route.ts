import { ensureCmsAdmin } from "@/lib/cms/ensure-admin";
import documentsClient from "@/lib/appDocumentsClient";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "bson";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { ExamPartSchemaDto } from "@/models/examParts.model";

export async function POST(req: NextRequest) {
  // CMS-only: content can be changed (and full exam content read) by admins only.
  const gate = await ensureCmsAdmin();
  if (!gate.ok) return gate.response;
  const body = await req.json();
  const practiceParser = ExamPartSchemaDto.omit({ id: true }).safeParse({...body, partId: parseInt(body.partId)});

  if (practiceParser.success) {
    const practiceRepo = new ExamPartsRepository(documentsClient);
    const practiceDto = await practiceRepo.createExamPart(practiceParser.data);
    return NextResponse.json({ id: practiceDto.id }, { status: 200 });
  } else {
    return NextResponse.json({ message: practiceParser.error }, { status: 400 });
  }
}

export const GET = async function (req: NextRequest) {
  // CMS-only: content can be changed (and full exam content read) by admins only.
  const gate = await ensureCmsAdmin();
  if (!gate.ok) return gate.response;
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
  const practiceRepo = new ExamPartsRepository(documentsClient);
  const practices = await practiceRepo.getAllExamPart(
    filter,
    parseInt(page),
    parseInt(limit)
  );
  return NextResponse.json({ ...practices, filters: { partId, examId } }, { status: 200 });
};
