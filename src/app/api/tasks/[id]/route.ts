import mongoClient from "@/lib/mongodb";
import { TaskSchemaDto } from "@/models/tasks.model";
import { TaskRepository } from "@/repositories/tasks.repo";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const taskRepo = new TaskRepository(mongoClient);
    const task = await taskRepo.findTaskById(id);

    if (!task) {
        return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task, { status: 200 });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const body = await req.json();

    // Validate partial update
    const taskParser = TaskSchemaDto.omit({ id: true }).partial().safeParse(body);

    if (!taskParser.success) {
        return NextResponse.json({ message: taskParser.error }, { status: 400 });
    }

    const taskRepo = new TaskRepository(mongoClient);
    const updatedTask = await taskRepo.updateTask(id, taskParser.data);

    if (!updatedTask) {
        return NextResponse.json({ message: "Task not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(updatedTask, { status: 200 });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const taskRepo = new TaskRepository(mongoClient);
    await taskRepo.deleteTask(id);

    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
}
