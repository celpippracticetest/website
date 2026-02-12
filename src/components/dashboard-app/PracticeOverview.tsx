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

interface PracticeSection {
  title: string;
  color: string;
  icon: React.ReactNode;
  tasks: TTaskSchemaDto[];
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
  const isMobile = useIsMobile();
  useEffect(() => {
    setTaskInStore(tasks);
  }, [setTaskInStore, tasks]);

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

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const practiceSections: PracticeSection[] = [
    {
      title: "Listening",
      color: "text-[#0DAA94]",
      icon: <SvgListeningPart />,
      bgColor: "bg-[#E6F6F4]",
      route: "listening",
      tasks:
        tasks["listening"]?.sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace(/\D/g, "")) -
            parseInt(b.taskNumber.replace(/\D/g, ""))
          );
        }) ?? [],
    },
    {
      title: "Reading",
      color: "text-[#EE4266]",
      bgColor: "bg-[#FEECEF]",
      icon: <SvgReadingPart />,
      route: "reading",
      tasks:
        tasks["reading"]?.sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace(/\D/g, "")) -
            parseInt(b.taskNumber.replace(/\D/g, ""))
          );
        }) ?? [],
    },
    {
      title: "Writing",
      color: "text-[#F27059]",
      icon: <SvgWritingPart />,
      bgColor: "bg-[#FFF1EE]",
      route: "writing",
      tasks:
        tasks["writing"]?.sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace(/\D/g, "")) -
            parseInt(b.taskNumber.replace(/\D/g, ""))
          );
        }) ?? [],
    },
    {
      title: "Speaking",
      color: "text-[#7C3AED]",
      icon: <SvgSpeakingPart />,
      bgColor: "bg-[#F1E9FE]",
      route: "speaking",
      tasks:
        tasks["speaking"]?.sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace(/\D/g, "")) -
            parseInt(b.taskNumber.replace(/\D/g, ""))
          );
        }) ?? [],
    },
  ];

  return (
    <div className="flex flex-col w-full px-[16px] screen1280:!px-[40px] bg-[#F4F7FF] py-18 screen1280:!py-24 gap-6">
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="flex h-[24px] screen1280:hidden gap-[8px] flex-col w-full items-start">
        <span className="text-[18px] text-[#37465C] font-semibold">
          Practices
        </span>
      </div>

      {/* Desktop Grid Layout (>= 1280px) */}
      <div className="hidden screen1280:grid grid-cols-4 gap-8">
        {practiceSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-8">
            {/* Desktop Header */}
            <div className="flex flex-col items-center gap-2">
              <div className={`flex items-center justify-center w-[72px] h-[72px] rounded-full ${section.bgColor} ${section.color}`}>
                <div className="scale-150">{section.icon}</div>
              </div>
              <h2 className={`text-[20px] font-bold ${section.color}`}>
                {section.title}
              </h2>
            </div>

            {/* Desktop Tasks List */}
            <div className="flex flex-col gap-4">
              {section.tasks.map((task, index) => (
                <div
                  key={`${section.title}-${index}`}
                  onClick={() => {
                    if (!task?.id) return;
                    setSelectedTask(task);
                  }}
                  className="group flex flex-col p-5 bg-white rounded-[16px] shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-[#0DAA94]/20 relative"
                >
                  {selectedTask?.id == task?.id && (
                    <div className="absolute inset-0 bg-white/80 rounded-[16px] flex items-center justify-center z-10">
                      <LoaderCircle className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  )}

                  <div className="mb-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#F1F5F9] text-[#64748B]">
                      Task {index + 1}
                    </span>
                  </div>

                  <h3 className="text-[#212E42] font-bold text-[18px] leading-snug">
                    {task.name}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Accordion Layout (< 1280px) */}
      <div className="flex flex-col gap-3 screen1280:hidden">
        {practiceSections.map((section) => {
          const isExpanded = expandedSections.has(section.title);
          return (
            <div key={section.title} className="flex flex-col w-full bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden">
              {/* Accordion Header */}
              <div
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between p-4 screen1280:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 screen1280:w-12 screen1280:h-12 rounded-full ${section.bgColor} ${section.color}`}>
                    {section.icon}
                  </div>
                  <h2 className="text-[18px] screen1280:!text-[22px] text-[#212E42] font-semibold">
                    {section.title}
                  </h2>
                </div>
                <div className="text-[#37465C]">
                  {isExpanded ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  )}
                </div>
              </div>

              {/* Accordion Content */}
              <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100 border-t border-[#E5E7EB]" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className={`${section.bgColor} p-4 screen1280:p-6`}>
                    <div className="grid grid-cols-1 screen744:grid-cols-2 screen1024:grid-cols-2 screen1440:grid-cols-2 gap-4 screen744:gap-6">
                      {section.tasks.map((task, index) => (
                        <div
                          key={`${section.title}-${index}`}
                          onClick={() => {
                            if (!task?.id) return;
                            setSelectedTask(task);
                          }}
                          className="group flex flex-col p-5 screen1280:p-6 cursor-pointer bg-white rounded-[20px] shadow-sm hover:shadow-md transition-all border border-transparent hover:border-[#0DAA94]/20 relative"
                        >
                          {selectedTask?.id == task?.id && (
                            <div className="absolute inset-0 bg-white/80 rounded-[20px] flex items-center justify-center z-10">
                              <LoaderCircle className="w-6 h-6 animate-spin text-blue-500" />
                            </div>
                          )}

                          {/* Task Number Badge */}
                          <div className="mb-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium bg-[#F1F5F9] text-[#64748B]">
                              {task.taskNumber}
                            </span>
                          </div>

                          {/* Task Name */}
                          <h3 className="text-[#212E42] font-bold text-[18px] screen1280:text-[22px] leading-tight mb-6">
                            {task.name}
                          </h3>

                          {/* Action Link */}
                          <div className="mt-auto flex items-center gap-2 text-[#316BFF] font-semibold text-[14px] screen1280:text-[16px]">
                            <span>Select</span>
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                              <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PracticeOverview;
