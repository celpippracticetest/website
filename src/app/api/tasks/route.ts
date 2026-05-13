import documentsClient from "@/lib/appDocumentsClient";
import { TaskSchemaDto, TTaskCategoryEnum, TTaskTypeEnum } from "@/models/tasks.model";
import { TaskRepository } from "@/repositories/tasks.repo";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const taskParser = TaskSchemaDto.omit({ id: true }).safeParse(body);

  if (taskParser.success) {
    const taskRepo = new TaskRepository(documentsClient);
    const taskDto = await taskRepo.createTask(taskParser.data);
    return NextResponse.json({ id: taskDto.id }, { status: 200 });
  } else {
    return NextResponse.json({ message: taskParser.error }, { status: 400 });
  }
}
export async function GET(req: NextRequest) {
  const type: string | null = req.nextUrl.searchParams.get("type");
  const category: string | null = req.nextUrl.searchParams.get("category");
  const isFree: string | null = req.nextUrl.searchParams.get("isFree");
  const page: string = req.nextUrl.searchParams.get("page") ?? "0";
  const limit: string = req.nextUrl.searchParams.get("limit") ?? "10";

  const taskRepo = new TaskRepository(documentsClient);
  const filter: Record<string, TTaskTypeEnum | TTaskCategoryEnum | string> = {}; 
  if(type){
    filter['type'] = type as TTaskTypeEnum;
  }

  if(category){
    filter['category'] = category as TTaskTypeEnum;
  }
  const tasks = await taskRepo.getAllTask(
    filter,
    parseInt(page),
    parseInt(limit)
  );
  return NextResponse.json({ ...tasks, filters: { type, isFree } }, { status: 200 });
}
