import WritingPractice from "@/components/dashboard-app/writing-practice/WritingPractice";
import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgWritingPart from "@/components/icons/WritingPart";
import mongoClient from "@/lib/mongodb";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { WritingAnswerRepository } from "@/repositories/writingAnswers";
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
  title: "Free CELPIP Writing Practice Tests & Mock Exams | CELPIPPRACTICETEST",
  description:
    "Get higher CELPIP Writing marks with practice prompts, instant AI feedback, and model answers. Hone grammar, coherence, task response fast | CELPIPPRACTICETEST.com",
  alternates: {
    canonical: "https://celpippracticetest.com/writing",
  },
};

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
        <div className="flex  h-[52px] screen744:!hidden gap-[8px] flex-col w-full items-start">
          <span className="text-[18px] text-[#37465C] font-semibold">
            Practice
          </span>
          <span className="text-[14px] text-[#76808F] font-normal">
            Writing
          </span>
        </div>
        <ShowTasks tasks={writingTasks.map(t => ({ ...t, icon: <SvgWritingPart className="text-[#0DAA94]" />, title: "Writing Practice" }))} />
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
      taskId: taskId ? (new ObjectId(taskId) as any) : undefined,
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
    const writingAnswerRepo = new WritingAnswerRepository(mongoClient);
    completedPracticeId =
      await writingAnswerRepo.findAnswersByPracticeIdsAndUser(
        practices.items.map((p) => p.id),
        user.id
      );
  }

  return (
    <main className=" bg-[#F2F6FF] min-h-screen flex w-full justify-center ">
      <WritingPractice
        showHeader={true}
        allPractices={practices.items}
        selectedPractice={selectedPractice}
        task={task}
        completedPracticeId={completedPracticeId}
      />
    </main>
  );
};

export default WritingPage;
