import ExamOverview from "@/components/dashboard-app/examOverview";
import documentsClient from "@/lib/appDocumentsClient";
import { ExamRepository } from "@/repositories/exams.repo";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { buildExamProgressById } from "@/lib/examOverviewProgress";
import { currentUser } from "@/lib/auth/web-auth-session";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title:
      "CELPIP Mock Exam Overview: Practice Like the Real Test | CELPIP Practice Test",
    alternates: {
      canonical: "https://celpippracticetest.com/exam-overview",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

const ExamsPage = async () => {
  const exampRepo = new ExamRepository(documentsClient);
  const result = await exampRepo.getAllExam({ isReady: true }, 0, 1000);
  const exams = result.items;
  let progressByExamId: Record<
    string,
    { completedParts: number; totalParts: number; completionPercentage: number }
  > = {};

  try {
    const user = await currentUser();
    if (user?.id && exams.length > 0) {
      const answersRepo = new ListeningAndReadingAnswerRepository(
        documentsClient,
      );
      const partitioned = await answersRepo.getPartitionedMockExamProgressAnswers(
        user.id,
        exams.map((exam) => exam.id),
      );
      progressByExamId = buildExamProgressById({
        examIds: exams.map((exam) => exam.id),
        examPartCountsById: {},
        listeningAndReadingAnswers: partitioned.listeningAndReading,
        writingAndSpeakingAnswers: partitioned.writingAndSpeaking,
      });
    }
  } catch {
    progressByExamId = {};
  }

  return (
    <ExamOverview exams={exams} progressByExamId={progressByExamId} />
  );
};

export default ExamsPage;
