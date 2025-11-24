"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { TTaskSchemaDto } from "@/models/tasks.model";
import useStore from "@/store";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SvgListeningPart from "../icons/ListeningPart";
import SvgReadingPart from "../icons/ReadingPart";
import SvgWritingPart from "../icons/WritingPart";
import SvgSpeakingPart from "../icons/SpeakingPart";

interface PracticeTask {
  taskNumber: string;
  name: string;
}

interface PracticeSection {
  title: string;
  color: string;
  icon: React.ReactNode;
  tasks: PracticeTask[];
  route: string;
  bgColor: string;
}

const PracticeOverview = ({
  tasks,
}: {
  tasks: {
    speaking: TTaskSchemaDto[];
    listening: TTaskSchemaDto[];
    writing: TTaskSchemaDto[];
    reading: TTaskSchemaDto[];
  };
}) => {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<TTaskSchemaDto | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const setTaskInStore = useStore((state) => state.setTasks);
  setTaskInStore(tasks);
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

  const practiceSections: PracticeSection[] = [
    {
      title: "Listening",
      color: "text-[#316BFF]",
      icon: <SvgListeningPart />,
      bgColor: "bg-[#D1DEFF]",
      route: "listening",
      tasks:
        tasks["listening"].sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace("Task #", "")) -
            parseInt(b.taskNumber.replace("Task #", ""))
          );
        }) ?? [],
    },
    {
      title: "Speaking",
      color: "text-[#EE4266]",
      icon: <SvgSpeakingPart />,
      bgColor: "bg-[#FFEBD6]",

      route: "speaking",
      tasks:
        tasks["speaking"].sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace("Task #", "")) -
            parseInt(b.taskNumber.replace("Task #", ""))
          );
        }) ?? [],
    },
    {
      title: "Writing",
      color: "text-[#0DAA94]",
      icon: <SvgWritingPart />,
      bgColor: "bg-[#F0FFFD]",
      route: "writing",
      tasks:
        tasks["writing"].sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace("Task #", "")) -
            parseInt(b.taskNumber.replace("Task #", ""))
          );
        }) ?? [],
    },
    {
      title: "Reading",
      color: "text-[#F27059]",
      bgColor: "bg-[#FFE2E8]",
      icon: <SvgReadingPart />,
      route: "reading",
      tasks:
        tasks["reading"].sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace("Task #", "")) -
            parseInt(b.taskNumber.replace("Task #", ""))
          );
        }) ?? [],
    },
  ];
  return (
    <div className="flex flex-wrap screen744:!flex-nowrap px-[16px] transition-all  duration-1000 ease-in-out screen744:!w-full screen1280:!w-full  gap-4 screen744:!px-[16px] screen1280:!px-[40px] justify-center bg-[#F4F7FF] pt-[16px]">
      <div className="flex  h-[52px] screen744:!hidden gap-[8px] flex-col w-full items-start">
        <span className="text-[18px] text-[#37465C] font-semibold">
          Practice
        </span>
        <span className="text-[14px] text-[#76808F] font-normal">All</span>
      </div>
      {practiceSections.map((section) => (
        <div key={section.title} className="flex  w-full  flex-col gap-4  ">
          <div
            className={`flex  justify-center rounded-[12px] items-center h-[60px] ${section.color} ${section.bgColor}`}
          >
            {section.icon}
            <h2 className="text-[16px] screen1280:!text-[20px] text-[#37465C] font-semibold ml-2">
              {section.title}
            </h2>
          </div>

          <div className="grid  grid-cols-2 screen744:!grid-cols-1  gap-[16px] mb-[16px]">
            {section.tasks.map((task, index) => (
              <div
                key={`${section.title}-${index}`}
                onClick={() => {
                  if (!task?.id) {
                    return;
                  }
                  setSelectedTask(task as TTaskSchemaDto);
                }}
                className="flex flex-col basis-[50%] screen744:!w-full items-end relative p-[16px] cursor-pointer bg-white  h-auto min-h-[96px] rounded-[12px] hover:shadow-md transition-shadow"
              >
                {selectedTask?.id == task?.id && (
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
                <div className="flex gap-[8px] flex-col h-auto min-h-[64px] justify-betwee w-full">
                  <div className="text-[12px] screen1280:!text-[14px] h-[28px] text-[#37465C] font-normal flex items-center justify-start shrink-0">
                    {task.taskNumber}
                  </div>
                  <div className="text-[#37465C] h-auto min-h-[28px] font-semibold text-[14px] screen1280:!text-[16px] w-full">
                    {task.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PracticeOverview;
