import documentsClient from "@/lib/appDocumentsClient";
import { ExamRepository } from "@/repositories/exams.repo";

export async function getFirstReadyMockExamId(): Promise<string | null> {
  const repo = new ExamRepository(documentsClient);
  const { items } = await repo.getAllExam({ isReady: true }, 0, 1);
  return items[0]?.id ?? null;
}
