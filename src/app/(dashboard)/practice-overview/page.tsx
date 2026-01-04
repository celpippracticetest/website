"use client";

import PracticeOverview from "@/components/dashboard-app/PracticeOverview";
import { useEffect, useState } from "react";

type TaskCategory = "speaking" | "listening" | "writing" | "reading";

interface TaskItem {
  category: TaskCategory;
  [key: string]: any;
}

interface TasksList {
  speaking: TaskItem[];
  listening: TaskItem[];
  writing: TaskItem[];
  reading: TaskItem[];
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
            (current: TasksList, taskItem: TaskItem) => {
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

  // Show skeleton loader while fetching - page renders instantly
  if (isLoading) {
    return <PracticeSkeletonLoader />;
  }

  return (
    <div className="flex flex-col w-full items-end mb-[120px]">
      <PracticeOverview tasks={tasks} />
    </div>
  );
};

export default DashboardApp;
