import documentsClient from "@/lib/appDocumentsClient";
import { ExamRepository } from "@/repositories/exams.repo";
import { isFreeGuestMockExam } from "@/lib/freeMockExam";
import { hasMockExamAccess } from "@/lib/subscriptionAccess";

/** Paid access, or the complimentary first mock exam. */
export async function canPracticeMockExam(args: {
  examId: string | null | undefined;
  plan: string | null | undefined;
  purchaseDate: unknown;
  purchasedMockExamIds: unknown;
}): Promise<boolean> {
  if (!args.examId) return false;
  const exam = await new ExamRepository(documentsClient).findExamById(args.examId);
  if (isFreeGuestMockExam(exam)) return true;
  return hasMockExamAccess(
    args.plan,
    args.purchaseDate,
    args.examId,
    null,
    args.purchasedMockExamIds,
  );
}
