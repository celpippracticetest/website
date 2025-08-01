import ExamOverview from "@/components/dashboard-app/examOverview";
import mongoClient from "@/lib/mongodb";
import { ExamRepository } from "@/repositories/exams.repo";

const ExamsPage = async () => {
  const exampRepo = new ExamRepository(mongoClient);
  const result = await exampRepo.getAllExam({isReady: true},0, 1000);

  return <ExamOverview exams={result.items} />;
};

export default ExamsPage;
