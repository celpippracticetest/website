"use client";

import PracticeOverview from "@/components/dashboard-app/PracticeOverview";
import { useEffect, useState } from "react";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { useUser } from "@clerk/nextjs";

interface TasksList {
  speaking: TTaskSchemaDto[];
  listening: TTaskSchemaDto[];
  writing: TTaskSchemaDto[];
  reading: TTaskSchemaDto[];
}

// Skeleton loader component
const PracticeSkeletonLoader = () => (
  <div className="flex flex-col w-full items-end p-6 animate-pulse">
    <div className="w-full max-w-6xl space-y-6">
      {/* Header skeleton */}
      <div className="h-12 bg-gray-200 rounded-lg w-64"></div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm space-y-3">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-5/6"></div>
            <div className="h-10 bg-gray-200 rounded w-32 mt-4"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DashboardApp = () => {
  const { isSignedIn } = useUser();
  const [tasks, setTasks] = useState<TasksList>({
    speaking: [],
    listening: [],
    writing: [],
    reading: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/tasks?type=practice&limit=100");
        if (response.ok) {
          const data = await response.json();
          const tasksList = data.items.reduce(
            (current: TasksList, taskItem: TTaskSchemaDto) => {
              current[taskItem.category].push(taskItem);
              return current;
            },
            { speaking: [], listening: [], writing: [], reading: [] }
          );
          setTasks(tasksList);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  return (
    <main className="flex flex-col w-full items-end mb-[120px]">
      <h1 className="sr-only">CELPIP Practice Overview</h1>
      {!isSignedIn && (
        <section className="w-full max-w-6xl mx-auto px-4 pt-6 pb-4">
          <h2 className="text-[28px] screen744:text-[34px] font-bold text-[#37465C]">
            CELPIP Practice Overview
          </h2>
          <p className="mt-3 text-[16px] leading-[26px] text-[#526071]">
            Choose focused CELPIP practice by skill and train with realistic task formats for
            Listening, Reading, Writing, and Speaking. This page helps you plan daily study,
            pick the next task quickly, and build confidence before full mock exams.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            The most effective preparation combines deliberate practice and repetition. Start with
            your weakest skill, complete one timed task, and review every incorrect answer or weak
            response. Then move to a second skill to improve stamina and concentration across
            multiple sections, similar to the real CELPIP exam experience.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            Use short cycles: practice, review, correct, and repeat. In Listening and Reading,
            track question types you miss most often. In Writing and Speaking, focus on structure,
            grammar control, and idea development. Small targeted improvements in each cycle are
            more reliable than random high-volume practice.
          </p>
          <p className="mt-2 text-[15px] leading-[24px] text-[#526071]">
            If your exam date is close, prioritize consistency over intensity. Daily focused
            sessions of 45 to 90 minutes usually outperform occasional long sessions. Keep notes
            on recurring mistakes, revisit them weekly, and measure progress by accuracy, timing,
            and confidence under test-like conditions.
          </p>
        </section>
      )}
      {isLoading ? <PracticeSkeletonLoader /> : <PracticeOverview tasks={tasks} />}
    </main>
  );
};

export default DashboardApp;
