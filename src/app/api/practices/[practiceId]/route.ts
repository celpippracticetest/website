import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import documentsClient from "@/lib/appDocumentsClient";
import { PracticeDtoSchema } from "@/models/practice.model";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ practiceId: string }> }
) {
  const { practiceId } = await params;
  const practiceRepo = new PracticeRepository(documentsClient);
  const practice = await practiceRepo.findPractice(practiceId);
  if (!practice) {
    return NextResponse.json({ item: null }, { status: 404 });
  }
  return NextResponse.json({ item: practice }, { status: 200 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ practiceId: string }> }
) {
  const { practiceId } = await params;
  const practiceRepo = new PracticeRepository(documentsClient);
  await practiceRepo.deletePractice(practiceId);
  return NextResponse.json({ status: 200 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ practiceId: string }> }
) {
  const { practiceId } = await params;
  const body = await req.json();
  const practiceParser = PracticeDtoSchema.omit({ id: true }).safeParse(body);

  if (!practiceParser.success) {
    return NextResponse.json({ message: practiceParser.error }, { status: 400 });
  }

  const practiceRepo = new PracticeRepository(documentsClient);
  const practiceDto = await practiceRepo.updatePractice(practiceId, practiceParser.data);
  if (!practiceDto) {
    return NextResponse.json({ message: "Practice not found" }, { status: 404 });
  }
  return NextResponse.json({ ...practiceDto }, { status: 200 });
}
