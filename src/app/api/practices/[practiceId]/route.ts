import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { ObjectId } from "bson";
import { PracticeDtoSchema } from "@/models/practice.model";


export async function GET(req: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  const {practiceId} =await params;
  const practiceRepo = new PracticeRepository(mongoClient);
  const practice = await practiceRepo.findPractice(practiceId);
  return NextResponse.json({ item: practice}, { status: 200 });
}


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
    const {practiceId} =await params;
    const practiceRepo = new PracticeRepository(mongoClient);
    await practiceRepo.deletePractice(practiceId);
    return NextResponse.json({ status: 200 });
  }
  

  export async function PUT(req: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
    const {practiceId} =await params;
    const body = await req.json();
    const practiceParser = PracticeDtoSchema.omit({ id: true }).safeParse(body);
  
    if (practiceParser.success) {
      const practiceRepo = new PracticeRepository(mongoClient);
      const practiceDto = await practiceRepo.updatePractice(practiceId, practiceParser.data);
      return NextResponse.json({ ...practiceDto }, { status: 200 });
    } else {
      return NextResponse.json({ message: practiceParser.error }, { status: 400 });
    }
  }