import ExamOverview from "@/components/dashboard-app/examOverview";
import mongoClient from "@/lib/mongodb";
import { ExamRepository } from "@/repositories/exams.repo";
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
  const exampRepo = new ExamRepository(mongoClient);
  const result = await exampRepo.getAllExam({ isReady: true }, 0, 1000);

  return <ExamOverview exams={result.items} />;
};

export default ExamsPage;
