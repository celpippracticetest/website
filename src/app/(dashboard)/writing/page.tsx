import WritingPractice from "@/components/dashboard-app/writing-practice/WritingPractice";
import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgWritingPart from "@/components/icons/WritingPart";
import mongoClient from "@/lib/mongodb";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
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

const writingMetadataBase: Metadata = {
  title: "Free CELPIP Writing Practice Tests & Mock Exams | CELPIPPRACTICETEST",
  description:
    "Get higher CELPIP Writing marks with practice prompts, instant AI feedback, and model answers. Hone grammar, coherence, task response fast | CELPIPPRACTICETEST.com",
  keywords: [
    "celpip writing practice test",
    "celpip sample writing test",
    "celpip writing practice",
    "celpip writing test",
    "celpip writing samples",
    "celpip general writing",
    "celpip general writing test",
    "celpip mock test writing",
    "celpip practice test writing",
    "celpip practice writing test",
    "celpip general writing sample answers",
  ],
  alternates: {
    canonical: "https://celpippracticetest.com/writing",
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
    ...writingMetadataBase,
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

const WritingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;

  const taskRepo = new TaskRepository(mongoClient);
  const tasks = await taskRepo.getAllTask({ type: "practice" }, 0, 100);

  const writingTasks: PracticeSection[] = [
    {
      tasks: tasks.items
        .filter((taskItem) => taskItem.category === "writing")
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
      route: "writing",
    },
  ];

  const user = await currentUser();
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = tasks.items
      .filter((taskItem) => taskItem.category === "writing")
      .sort((a, b) => {
        const numA = parseInt(a.taskNumber.replace(/\D/g, ""));
        const numB = parseInt(b.taskNumber.replace(/\D/g, ""));
        return numA - numB;
      })
      .map((taskItem) => ({
        id: taskItem.id,
        taskNumber: taskItem.taskNumber,
      }));

    return <SkillLandingPage content={skillPagesContent.writing} skillType="writing" availableTasks={availableTasks} />;
  }

  if (!selectedPracticeId && !taskId) {
    return (
      <ShowTaskHeader>
        <div className="flex mt-[32px]  screen744:!mt-[0] items-center justify-center gap-[8px] max-w-[1200px] w-full !h-[60px] shrink-0 rounded-[12px] bg-[#D5F5F0]">
          <SvgWritingPart className="text-[#0DAA94]" />
          <h1 className="text-[#37465C] font-semibold text-[20px]">
            Writing Practice
          </h1>
        </div>
        <ShowTasks tasks={writingTasks} />
      </ShowTaskHeader>
    );
  }

  const task: TTaskSchemaDto | null = await taskRepo.findTaskById(taskId ?? "");
  if (!task) {
    redirect("practice-overview", RedirectType.push);
  }

  const practiceRepo = new PracticeRepository(mongoClient);
  const practices = await practiceRepo.getAllPractice(
    {
      type: "WRITING",
      taskId: taskId ? (new ObjectId(taskId) as unknown as string) : undefined,
    },
    0,
    200
  );
  let selectedPractice = null;
  let completedPracticeId: string[] = [];

  if (selectedPracticeId) {
    selectedPractice = await practiceRepo.findPractice(selectedPracticeId);

    if (
      (!user ||
        !user.publicMetadata.plan ||
        user.publicMetadata.plan !== "premium") &&
      selectedPractice &&
      !selectedPractice.isFree
    ) {
      selectedPractice.passages[0].body =
        selectedPractice.passages[0].body?.slice(0, 150) +
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
      selectedPractice.passages[0].sampleResponse =
        selectedPractice.passages[0].sampleResponse?.map((item) => {
          item.body =
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
          return item;
        });
    }
  }
  if (user) {
    const writingAnswerRepo = new WritingAndSpeakingAnswerRepository(mongoClient);
    completedPracticeId =
      await writingAnswerRepo.findAnswersByPracticeIdsAndUser(
        practices.items.map((p) => p.id),
        user.id
      );
  }

  return (
    <main className="bg-[#F2F6FF] min-h-screen flex w-full justify-center">
      <div className="w-full max-w-[1280px]">
        <h1 className="sr-only">CELPIP Writing Practice</h1>
        <WritingPractice
          showHeader={true}
          allPractices={practices.items}
          selectedPractice={selectedPractice}
          task={task}
          completedPracticeId={completedPracticeId}
        />
        {!user && (
          <section className="px-4 pb-10">
          <h2 className="text-[22px] font-semibold text-[#37465C]">
            CELPIP Writing practice strategy
          </h2>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            Raise Writing performance by organizing each response with a clear purpose, logical
            paragraph flow, and accurate grammar under exam timing.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            After each task, review coherence, task response, vocabulary variety, and sentence
            control to identify one priority fix for your next attempt.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            A reliable method is to plan before you write. Spend one to two minutes defining your
            purpose, main points, and tone. This short planning step prevents off-topic responses
            and improves organization, which is critical for higher band scoring in CELPIP tasks.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            During revision, prioritize high-impact edits: sentence clarity, verb tense
            consistency, and linking phrases that improve flow. You do not need advanced language
            in every sentence. You need clear, correct, and relevant communication from start to
            finish.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            Build confidence by comparing older and newer responses side by side. When you can see
            stronger structure and fewer repeated errors over time, your writing process becomes
            faster and more stable under exam timing.
          </p>
          </section>
        )}
      </div>
    </main>
  );
};

export default WritingPage;
