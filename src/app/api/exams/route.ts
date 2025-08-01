import mongoClient from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ExamRepository } from "@/repositories/exams.repo";

export const GET = async function (req: NextRequest) {
  const page: string = req.nextUrl.searchParams.get("page") ?? "0";
  const limit: string = req.nextUrl.searchParams.get("limit") ?? "10";

  const examRepo = new ExamRepository(mongoClient);
  const exams = await examRepo.getAllExam({}, parseInt(page), parseInt(limit));
  return NextResponse.json({ ...exams, filters: {} }, { status: 200 });
};
