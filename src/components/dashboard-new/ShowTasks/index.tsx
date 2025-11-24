"use client";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSelectedTask } from "@/store/useSelectedTask.store";
import { LoaderCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const ShowTasks = ({ tasks }: any) => {
  const { selectedTask, setSelectedTask } = useSelectedTask();
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!selectedTask) {
      return;
    }
    if (!isMobile) {
      fetchPractices(selectedTask);
    } else {
      setRedirectUrl(selectedTask?.category + "?taskId=" + selectedTask.id);
    }
    return () => {
      setSelectedTask(null);
    };
  }, [selectedTask]);

  useEffect(() => {
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  }, [redirectUrl]);

  const fetchPractices = async (task: TTaskSchemaDto | null) => {
    try {
      if (!task) {
        return;
      }

      const response = await fetch(
        `/api/practices?type=${task.category}&page=0&limit=1&taskId=${task.id}`
      ); // Replace with your API endpoint
      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }
      const data = await response.json();
      if (!data || data.items.length === 0) {
        return;
      }

      setRedirectUrl(
        task.category +
        "?selectedPracticeId=" +
        data.items[0].id +
        "&taskId=" +
        task.id
      );
    } catch (error) { }
  };
  return (
    <div className="gap-[16px] bg-[#F4F7FF] pt-[16px] max-w-[1200px] w-full">
      {tasks.map((section: any, index: number) => (
        <div
          key={index}
          className="grid grid-cols-2 screen744:grid-cols-3 gap-[16px] mb-[16px]"
        >
          {section.tasks.map((task: any, index: number) => (
            <div
              key={`${section.title}-${index}`}
              onClick={() => {
                if (!task.id) {
                  return;
                }
                setSelectedTask(task as TTaskSchemaDto);
              }}
              className="flex flex-col relative p-[16px] justify-center cursor-pointer bg-white h-auto min-h-[96px] rounded-[12px] hover:shadow-md transition-shadow"
            >
              {selectedTask?.id == task.id && (
                <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
                  <LoaderCircle
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className=" w-6 h-6 animate-spin text-blue-500"
                  />
                </div>
              )}
              <div className="flex gap-[8px] flex-col h-auto min-h-[64px] w-full justify-between">
                <div className="text-[14px] text-[#37465C] font-normal flex items-center justify-start shrink-0">
                  {task.taskNumber}
                </div>
                <div className="text-[#37465C] font-semibold text-[16px] w-full">
                  {task.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ShowTasks;
