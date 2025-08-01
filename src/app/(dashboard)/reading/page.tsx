import ReadingPractice from "@/components/dashboard-app/reading-practice/ReadingPractice";
import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgReadingPart from "@/components/icons/ReadingPart";
import mongoClient from "@/lib/mongodb";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { currentUser } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { redirect, RedirectType } from "next/navigation";

export const metadata = {
  title: "Free CELPIP Reading Practice Tests & Mock Exams | CELPIPPRACTICETEST",
  description:
    "Boost CELPIP Reading scores with realistic passages, quick explanations, and speed drills. Strengthen scanning, inference, and time management | CELPIPPRACTICETEST.com",
  alternates: {
    canonical: "https://celpippracticetest.com/reading",
  },
};

interface PracticeTask {
  taskNumber: string;
  name: string;
}
interface PracticeSection {
  tasks: PracticeTask[];
  route: string;
}

const ReadingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;

  const taskRepo = new TaskRepository(mongoClient);
  const tasks = await taskRepo.getAllTask({ type: "practice" }, 0, 100);

  const readingTasks: PracticeSection[] = [
    {
      tasks: tasks.items
        .filter((taskItem) => taskItem.category === "reading")
        .sort((a, b) => {
          const numA = parseInt(a.taskNumber.replace(/\D/g, ""));
          const numB = parseInt(b.taskNumber.replace(/\D/g, ""));
          return numA - numB;
        })
        .map((taskItem) => ({
          id: taskItem.id,
          category: taskItem.category,
          taskNumber: taskItem.taskNumber,
          name: taskItem.name,
        })),
      route: "reading",
    },
  ];

  if (!selectedPracticeId && !taskId) {
    return (
      <ShowTaskHeader>
        <div className="flex  h-[52px] screen744:!hidden gap-[8px] flex-col w-full items-start">
          <span className="text-[18px] text-[#37465C] font-semibold">
            Practice
          </span>
          <span className="text-[14px] text-[#76808F] font-normal">
            Reading
          </span>
        </div>
        <div className="flex mt-[32px]  screen744:!mt-[0] items-center justify-center gap-[8px] max-w-[792px] w-full h-[60px] rounded-[12px] bg-[#FFE2E8]">
          <SvgReadingPart className="text-[#EE4266]" />
          <span className="text-[#37465C] font-semibold text-[20px]">
            Reading Practice
          </span>
        </div>
        <ShowTasks tasks={readingTasks} />
      </ShowTaskHeader>
    );
  }
  const task: TTaskSchemaDto | null = await taskRepo.findTaskById(taskId ?? "");

  if (!task) {
    redirect("practice-overview", RedirectType.replace);
    return <div></div>;
  }

  const practiceRepo = new PracticeRepository(mongoClient);
  const practices = await practiceRepo.getAllPractice(
    {
      type: "READING",
      taskId: taskId ? new ObjectId(taskId) : undefined,
    },
    0,
    200
  );
  let selectedPractice = null;
  if (selectedPracticeId) {
    selectedPractice = await practiceRepo.findPractice(selectedPracticeId);
  }
  const user = await currentUser();
  if (
    (!user ||
      !user.publicMetadata.plan ||
      user.publicMetadata.plan !== "premium") &&
    selectedPractice &&
    !selectedPractice.isFree &&
    selectedPractice.passages[0] &&
    selectedPractice.passages[0].body &&
    selectedPractice.passages[0].body.length > 20
  ) {
    selectedPractice.passages[0].body =
      selectedPractice.passages[0].body?.slice(0, 150) +
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
  }
  let answers: TListeningAndReadingAnswerDto | null = null;
  let completedPractice: string[] = [];
  if (user) {
    const listeningAndReadingAnswerRepo =
      new ListeningAndReadingAnswerRepository(mongoClient);
    if (selectedPracticeId) {
      answers = await listeningAndReadingAnswerRepo.findAnswerByPracticeAndUser(
        selectedPracticeId,
        user.id
      );
    }
    completedPractice =
      await listeningAndReadingAnswerRepo.findAllTaskIdsByTaskAndUser(
        task.id,
        user.id
      );
  }
  return (
    <main className="bg-[#F2F6FF] min-h-screen flex w-full pl-[16px] pr-[24px] pt-[16px]">
      <ReadingPractice
        allPractices={practices.items}
        selectedPractice={selectedPractice}
        task={task}
        previousAnswer={answers}
        completedPractice={completedPractice}
      />
    </main>
  );
};

export default ReadingPage;
