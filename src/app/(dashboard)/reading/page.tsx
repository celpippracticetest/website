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
import SkillLandingPage from "@/components/skill-landing/SkillLandingPage";
import { skillPagesContent } from "@/data/skill-pages-content";
import type { Metadata } from "next";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

const readingMetadataBase: Metadata = {
  title: "Free CELPIP Reading Practice Tests & Mock Exams | CELPIPPRACTICETEST",
  description:
    "Boost CELPIP Reading scores with realistic passages, quick explanations, and speed drills. Strengthen scanning, inference, and time management | CELPIPPRACTICETEST.com",
  keywords: [
    "celpip reading practise",
    "celpip reading test",
    "celpip reading sample",
    "celpip reading test sample",
    "celpip general reading",
    "celpip general reading test",
    "celpip reading practice test",
  ],
  alternates: {
    canonical: "https://celpippracticetest.com/reading",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  await searchParams;

  return {
    ...readingMetadataBase,
    robots: {
      index: true,
      follow: true,
    },
  };
}

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

  const user = await currentUser();
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = tasks.items
      .filter((taskItem) => taskItem.category === "reading")
      .sort((a, b) => {
        const numA = parseInt(a.taskNumber.replace(/\D/g, ""));
        const numB = parseInt(b.taskNumber.replace(/\D/g, ""));
        return numA - numB;
      })
      .map((taskItem) => ({
        id: taskItem.id,
        taskNumber: taskItem.taskNumber,
      }));

    return <SkillLandingPage content={skillPagesContent.reading} skillType="reading" availableTasks={availableTasks} />;
  }

  if (!selectedPracticeId && !taskId) {
    return (
      <ShowTaskHeader>
        <div className="flex mt-[32px]  screen744:!mt-[0] items-center justify-center gap-[8px] max-w-[1200px] w-full !h-[60px] shrink-0 rounded-[12px] bg-[#FFEBD6]">
          <SvgReadingPart className="text-[#F27059]" />
          <h1 className="text-[#37465C] font-semibold text-[20px]">
            Reading Practice
          </h1>
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
    !hasPaidPracticeAccess(
      user?.publicMetadata.plan as string | undefined,
      user?.publicMetadata.purchaseDate as string | undefined
    ) &&
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
    <main className="bg-[#F2F6FF] min-h-screen flex w-full justify-center">
      <div className="w-full max-w-[1280px]">
        <h1 className="sr-only">CELPIP Reading Practice</h1>
        <ReadingPractice
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
            CELPIP Reading practice strategy
          </h2>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            Build Reading speed by combining skimming for structure with scanning for exact
            details. Focus on keyword matching, paraphrase recognition, and elimination logic.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            To improve scores faster, review wrong answers by task type and repeat targeted drills
            before attempting another full Reading set.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            Begin each passage with a quick structure scan: title, headings, and paragraph roles.
            This helps you predict where key evidence is located before you answer questions. When
            time is limited, this structure-first method is more effective than reading every line
            at the same speed.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            For difficult items, avoid guessing based on one familiar word. Compare at least two
            options and confirm which one is fully supported by the text context. This habit
            reduces avoidable errors in inference, viewpoint, and detail-matching questions.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            Weekly score gains usually come from better process control: faster scanning, cleaner
            elimination, and disciplined timing. Track these three metrics after every session, and
            you will see clearer improvement trends than only tracking final score.
          </p>
          </section>
        )}
      </div>
    </main>
  );
};

export default ReadingPage;
