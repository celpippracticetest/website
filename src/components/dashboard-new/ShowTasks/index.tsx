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
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

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

  const getSectionStyles = (title: string = "") => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("listening")) return { bgColor: "bg-[#F0FFFD]", color: "text-[#316BFF]" };
    if (lowerTitle.includes("reading")) return { bgColor: "bg-[#FFF2F4]", color: "text-[#F27059]" };
    if (lowerTitle.includes("writing")) return { bgColor: "bg-[#F0FFFD]", color: "text-[#0DAA94]" };
    if (lowerTitle.includes("speaking")) return { bgColor: "bg-[#FFF8F0]", color: "text-[#EE4266]" };
    return { bgColor: "bg-gray-50", color: "text-gray-600" };
  };

  return (
    <div className="flex flex-col gap-6 bg-[#F4F7FF] pt-[16px] max-w-[1200px] w-full">
      {tasks.map((section: any, sectionIndex: number) => {
        const isExpanded = expandedSections.has(sectionIndex);
        const styles = getSectionStyles(section.title || section.route || "");

        return (
          <div key={sectionIndex} className="flex flex-col w-full bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            {/* Accordion Header */}
            {(section.title || section.icon || section.route) && (
              <div
                onClick={() => toggleSection(sectionIndex)}
                className="flex items-center justify-between p-4 screen1280:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {section.icon && (
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${styles.bgColor} ${styles.color}`}>
                      {section.icon}
                    </div>
                  )}
                  <h2 className="text-[18px] screen1280:!text-[22px] text-[#212E42] font-semibold">
                    {section.title || (section.route ? section.route.charAt(0).toUpperCase() + section.route.slice(1) : "Practice")}
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
            )}

            {/* Accordion Content */}
            <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100 border-t border-[#E5E7EB]" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <div className={`${(section.title || section.icon || section.route) ? styles.bgColor : ""} p-4 screen1280:p-6`}>
                  <div className="grid grid-cols-1 screen744:grid-cols-2 lg:grid-cols-2 gap-4 screen744:gap-6">
                    {section.tasks.map((task: any, taskIndex: number) => (
                      <div
                        key={`${sectionIndex}-${taskIndex}`}
                        onClick={() => {
                          if (!task.id) return;
                          setSelectedTask(task as TTaskSchemaDto);
                        }}
                        className="group flex flex-col p-5 screen1280:p-6 cursor-pointer bg-white rounded-[20px] shadow-sm hover:shadow-md transition-all border border-transparent hover:border-[#0DAA94]/20 relative"
                      >
                        {selectedTask?.id == task.id && (
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
  );
};

export default ShowTasks;
