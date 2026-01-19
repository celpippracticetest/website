import ListeningPractice from "@/components/dashboard-app/listening-practice/ListeningPractice";
import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgListeningPart from "@/components/icons/ListeningPart";
import mongoClient from "@/lib/mongodb";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { currentUser } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { redirect, RedirectType } from "next/navigation";
import SkillLandingPage from "@/components/skill-landing/SkillLandingPage";
import { skillPagesContent } from "@/data/skill-pages-content";

interface PracticeTask {
  taskNumber: string;
  name: string;
}
interface PracticeSection {
  tasks: PracticeTask[];
  route: string;
}

export const metadata = {
  title:
    "Free CELPIP Listening Practice Tests & Mock Exams | CELPIPPRACTICETEST",
  description:
    "Prepare for CELPIP Listening with authentic recordings, adaptive quizzes, and analytics. Improve accuracy, note‑taking, and exam‑day confidence | CELPIPPRACTICETEST.com",
  keywords: [
    "celpip listening practice test",
    "celpip listening test",
    "celpip listening practice",
    "celpip listening sample test",
    "celpip listening samples",
    "celpip listening test practice",
    "celpip listening mock test",
    "celpip mock test listening",
    "celpip general listening test",
    "celpip general listening practice test",
    "celpip listening practice test with answers",
    "celpip listening practice with answers",
    "celpip audio sample",
  ],
  alternates: {
    canonical: "https://celpippracticetest.com/listening",
  },
};

const DashboardApp = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;
  const taskRepo = new TaskRepository(mongoClient);
  const tasks = await taskRepo.getAllTask({ type: "practice" }, 0, 100);

  const listeningTasks: PracticeSection[] = [
    {
      tasks: tasks.items
        .filter((taskItem) => taskItem.category === "listening")
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
      route: "listening",
    },
  ];

  const user = await currentUser();
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = tasks.items
      .filter((taskItem) => taskItem.category === "listening")
      .sort((a, b) => {
        const numA = parseInt(a.taskNumber.replace(/\D/g, ""));
        const numB = parseInt(b.taskNumber.replace(/\D/g, ""));
        return numA - numB;
      })
      .map((taskItem) => ({
        id: taskItem.id,
        taskNumber: taskItem.taskNumber,
      }));

    return <SkillLandingPage content={skillPagesContent.listening} skillType="listening" availableTasks={availableTasks} />;
  }

  if (!selectedPracticeId && !taskId) {
    return (
      <ShowTaskHeader>
        <div className="flex  h-[52px] screen744:!hidden gap-[8px] flex-col w-full items-start">
          <span className="text-[18px] text-[#37465C] font-semibold">
            Practice
          </span>
          <span className="text-[14px] text-[#76808F] font-normal">
            Listening
          </span>
        </div>
        <ShowTasks tasks={listeningTasks.map(t => ({ ...t, icon: <SvgListeningPart className="text-[#316BFF]" />, title: "Listening Practice" }))} />
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
      type: "LISTENING",
      taskId: taskId ? (new ObjectId(taskId) as unknown as string) : undefined,
    },
    0,
    200
  );
  let selectedPractice = null;
  if (selectedPracticeId) {
    selectedPractice = await practiceRepo.findPractice(selectedPracticeId);
  }

  if (
    (!user ||
      !user.publicMetadata.plan ||
      user.publicMetadata.plan !== "premium") &&
    selectedPractice &&
    !selectedPractice.isFree
  ) {
    selectedPractice = {
      ...selectedPractice,
      passages: [],
    };
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
    <main className=" bg-[#F2F6FF] min-h-screen flex w-full justify-center  max-w-[1280px] mx-auto">
      <div className="w-f"></div>
      <div className="w-full">
        <ListeningPractice
          showHeader={true}
          allPractices={practices.items}
          selectedPractice={selectedPractice}
          task={task}
          previousAnswer={answers}
          completedPractice={completedPractice}
        />
      </div>
    </main>
  );
};

export default DashboardApp;
