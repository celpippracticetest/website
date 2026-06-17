import documentsClient from "@/lib/appDocumentsClient";
import type { TTaskSchemaDto } from "@/models/tasks.model";
import { TaskRepository } from "@/repositories/tasks.repo";

export type PracticeTasksBySkill = {
  speaking: TTaskSchemaDto[];
  listening: TTaskSchemaDto[];
  writing: TTaskSchemaDto[];
  reading: TTaskSchemaDto[];
};

export const EMPTY_PRACTICE_TASKS: PracticeTasksBySkill = {
  speaking: [],
  listening: [],
  writing: [],
  reading: [],
};

export function groupPracticeTasks(items: TTaskSchemaDto[]): PracticeTasksBySkill {
  const grouped: PracticeTasksBySkill = {
    speaking: [],
    listening: [],
    writing: [],
    reading: [],
  };
  for (const taskItem of items) {
    const category = taskItem.category as keyof PracticeTasksBySkill;
    if (category in grouped) {
      grouped[category].push(taskItem);
    }
  }
  return grouped;
}

export async function fetchPracticeTasks(): Promise<PracticeTasksBySkill> {
  const taskRepo = new TaskRepository(documentsClient);
  const result = await taskRepo.getAllTask({ type: "practice" }, 0, 100);
  return groupPracticeTasks(result.items);
}
