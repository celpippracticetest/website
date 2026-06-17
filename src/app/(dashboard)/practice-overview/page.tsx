import PracticeOverviewServer from "@/components/dashboard-app/PracticeOverviewServer";
import { fetchPracticeTasks } from "@/lib/practiceTasks";
import PracticeOverviewClient from "./PracticeOverviewClient";
import PracticeOverviewSeoSection from "./PracticeOverviewSeoSection";

export const revalidate = 3600;

export default async function PracticeOverviewPage() {
  const tasks = await fetchPracticeTasks();

  return (
    <>
      <PracticeOverviewClient />
      <PracticeOverviewServer tasks={tasks} />
      <PracticeOverviewSeoSection />
    </>
  );
}
