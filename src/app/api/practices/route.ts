import { PracticeDtoSchema } from "@/models/practice.model";
import { PracticeRepository } from "@/repositories/practice.repo";
import mongoClient from "@/lib/mongodb";
import { TExamType } from "@/models/enums";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const practiceParser = PracticeDtoSchema.omit({ id: true }).safeParse(body);

    if (practiceParser.success) {
      const practiceRepo = new PracticeRepository(mongoClient);
      const practiceDto = await practiceRepo.createPractice(
        practiceParser.data
      );
      return NextResponse.json({ id: practiceDto.id }, { status: 200 });
    } else {
      return NextResponse.json(
        { message: practiceParser.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("POST /api/practices error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
export const GET = async function (req: NextRequest) {
  const type: string | null = req.nextUrl.searchParams.get("type");
  const isFree: string | null = req.nextUrl.searchParams.get("isFree");
  const page: string = req.nextUrl.searchParams.get("page") ?? "0";
  const limit: string = req.nextUrl.searchParams.get("limit") ?? "10";
  const taskId: string | null = req.nextUrl.searchParams.get("taskId") ?? null;

  const practiceRepo = new PracticeRepository(mongoClient);
  const practices = await practiceRepo.getAllPractice(
    {
      type: type ? (type.toString().toUpperCase() as TExamType) : undefined,
      taskId: taskId ? new ObjectId(taskId) : undefined,
    },
    parseInt(page),
    parseInt(limit)
  );
  return NextResponse.json(
    { ...practices, filters: { type, isFree } },
    { status: 200 }
  );
};
