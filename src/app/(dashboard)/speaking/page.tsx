import SpeakingPractice from "@/components/dashboard-app/speaking-practice/SpeakingPractice";
import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
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

export const metadata = {
  title:
    "Free CELPIP Speaking Practice Tests & Mock Exams | CELPIPPRACTICETEST",
  description:
    "Simulate the real CELPIP Speaking test with timed tasks, AI grading, and expert tips. Track progress, boost fluency, and hit your target score | CELPIPPRACTICETEST.com",
  keywords: [
    "celpip speaking practice test",
    "celpip speaking test",
    "celpip speaking practice",
    "celpip practice test speaking",
    "celpip sample speaking questions",
    "celpip practice speaking test",
    "celpip general speaking sample test",
  ],
  alternates: {
    canonical: "https://celpippracticetest.com/speaking",
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
const SpeakingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;
  const taskRepo = new TaskRepository(mongoClient);
  const tasks = await taskRepo.getAllTask({ type: "practice" }, 0, 100);

  const speakingTasks: PracticeSection[] = [
    {
      tasks: tasks.items
        .filter((taskItem) => taskItem.category === "speaking")
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
      route: "speaking",
    },
  ];

  const user = await currentUser();
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = tasks.items
      .filter((taskItem) => taskItem.category === "speaking")
      .sort((a, b) => {
        const numA = parseInt(a.taskNumber.replace(/\D/g, ""));
        const numB = parseInt(b.taskNumber.replace(/\D/g, ""));
        return numA - numB;
      })
      .map((taskItem) => ({
        id: taskItem.id,
        taskNumber: taskItem.taskNumber,
      }));

    return <SkillLandingPage content={skillPagesContent.speaking} skillType="speaking" availableTasks={availableTasks} />;
  }

  if (!selectedPracticeId && !taskId) {
    return (
      <ShowTaskHeader>
        <div className="flex mt-[32px]  screen744:!mt-[0] items-center justify-center gap-[8px] max-w-[1200px] w-full !h-[60px] shrink-0 rounded-[12px] bg-[#FFEBD6]">
          <SvgSpeakingPart className="text-[#F27059]" />
          <span className="text-[#37465C] font-semibold text-[20px]">
            Speaking Practice
          </span>
        </div>
        <ShowTasks tasks={speakingTasks} />
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
      type: "SPEAKING",
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
    <main className=" bg-[#F2F6FF] min-h-screen flex w-full justify-center ">
      <SpeakingPractice
        showHeader={true}
        allPractices={practices.items}
        selectedPractice={selectedPractice}
        task={task}
        completedPracticeId={completedPracticeId}
      />
    </main>
  );
};

export default SpeakingPage;
