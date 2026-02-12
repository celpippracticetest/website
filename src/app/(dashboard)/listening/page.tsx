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
import type { Metadata } from "next";

interface PracticeTask {
  taskNumber: string;
  name: string;
}
interface PracticeSection {
  tasks: PracticeTask[];
  route: string;
}

const listeningMetadataBase: Metadata = {
  title: "Free CELPIP Listening Practice Tests & Mock Exams | CELPIPPRACTICETEST",
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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  const { taskId, selectedPracticeId } = await searchParams;
  const isTaskVariant = Boolean(taskId || selectedPracticeId);

  return {
    ...listeningMetadataBase,
    robots: isTaskVariant
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
  };
}

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
        <div className="flex mt-[32px]  screen744:!mt-[0] items-center justify-center gap-[8px] max-w-[1200px] w-full !h-[60px] shrink-0 rounded-[12px] bg-[#E3ECFF]">
          <SvgListeningPart className="text-[#316BFF]" />
          <h1 className="text-[#37465C] font-semibold text-[20px]">
            Listening Practice
          </h1>
        </div>
        <ShowTasks tasks={listeningTasks} />
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
    <main className="bg-[#F2F6FF] min-h-screen flex w-full justify-center">
      <div className="w-full max-w-[1280px]">
        <h1 className="sr-only">CELPIP Listening Practice</h1>
        <ListeningPractice
          showHeader={true}
          allPractices={practices.items}
          selectedPractice={selectedPractice}
          task={task}
          previousAnswer={answers}
          completedPractice={completedPractice}
        />
        {!user && (
          <section className="px-4 pb-10">
          <h2 className="text-[22px] font-semibold text-[#37465C]">
            CELPIP Listening practice strategy
          </h2>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            Improve Listening by training note-taking, identifying key details, and tracking
            distractors such as similar numbers, dates, or paraphrased options.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            Review every missed item by question type, then repeat a similar task under timed
            conditions to build accuracy and consistency for the real CELPIP test.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            A high-scoring routine uses short, repeatable cycles. First, complete one listening
            set without pausing. Second, review only your incorrect answers and identify exactly
            why each distractor looked correct. Third, replay critical moments and practice
            capturing keywords in fewer words. This improves both speed and attention.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            Focus especially on transitions, speaker intent, and paraphrased details. Many losses
            happen when learners search for exact words instead of meaning. Building this
            paraphrase recognition skill makes your performance more stable across different topics
            and accents.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            In the final preparation phase, simulate real test pressure by practicing with strict
            timing and no interruptions. Then compare results across several attempts to confirm
            that your accuracy stays consistent. Consistency, not one perfect attempt, is the best
            predictor of exam-day listening success.
          </p>
          </section>
        )}
      </div>
    </main>
  );
};

export default DashboardApp;
