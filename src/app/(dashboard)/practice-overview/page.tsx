import PracticeOverview from "@/components/dashboard-app/PracticeOverview";
import mongoClient from "@/lib/mongodb";
import { TaskRepository } from "@/repositories/tasks.repo";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "Practice Overview: CELPIP Tasks by Section | CELPIP Practice Test",
    alternates: {
      canonical: "https://celpippracticetest.com/practice-overview",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

const DashboardApp = async () => {
  const taskRepo = new TaskRepository(mongoClient);
  const tasks = await taskRepo.getAllTask({ type: "practice" }, 0, 100);
  const tasksList = tasks.items.reduce(
    (
      current: {
        [key in
          | "speaking"
          | "listening"
          | "writing"
          | "reading"]: typeof tasks.items;
      },
      taskItem
    ) => {
      current[taskItem.category].push(taskItem);
      return current;
    },
    { speaking: [], listening: [], writing: [], reading: [] }
  );
  return (
    <div className="flex flex-col w-full items-end ">
      <PracticeOverview tasks={tasksList} />
    </div>
  );
};

export default DashboardApp;
