import { PRACTICE_PARTS } from "@/constants";
import SvgChevronDownExam from "@/components/icons/ChevronDownExam";
import AskBeavoButton from "@/components/AskBeavo/AskBeavoButton";
import { useRouter, useSearchParams } from "next/navigation";
import React, { forwardRef } from "react";
import dynamic from "next/dynamic";
import { useAskBeavoStore } from "@/stores/askBeavoStore";

const FloatingChatIcon = dynamic(() => import("../../../AskBeavo/FloatingChatIcon"), {
    ssr: false,
});

interface ExamHeaderProps {
    setShowModal: (show: boolean) => void;
    examId: string | undefined;
    partId: number;
    examName: string | undefined;
    practiceSections: any[];
    getPartsForSection: (route: string) => { title: string; index: number }[];
    menuShowModal: boolean;
    examPractice: string;
    examNumber: number | undefined;
}

const ExamHeader = forwardRef<HTMLDivElement, ExamHeaderProps>(
    (
        {
            setShowModal,
            examId,
            partId,
            examName,
            practiceSections,
            getPartsForSection,
            menuShowModal,
            examPractice,
            examNumber
        },
        ref
    ) => {
        const router = useRouter();
        const searchParams = useSearchParams();
        const { isOpen, setOpen } = useAskBeavoStore();

        return (
            <>
                <div
                    className={`z-[999] fixed inset-0 flex items-center justify-center px-[14px] screen744:!px-[16px] screen1280:!px-[20px] transition-opacity ${menuShowModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                        }`}
                >
                    <div
                        ref={ref}
                        className={`max-w-[725px] w-full h-[90vh] screen1280:!h-[828px] p-[24px] bg-white rounded-[16px] transform transition-all duration-300 ease-out overflow-y-auto ${menuShowModal ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
                            }`}
                    >
                        <div className="w-full flex flex-col screen1280:!flex-row gap-[16px]">
                            {practiceSections.map((section) => (
                                <div
                                    key={section.title}
                                    className="flex w-full screen1280:!max-w-[220px] flex-col gap-4"
                                >
                                    <div
                                        className={`flex  justify-center rounded-[12px] items-center h-[60px] ${section.color} ${section.bgColor}`}
                                    >
                                        {section.icon}
                                        <h2 className="text-[16px] screen1280:!text-[16px] text-[#37465C] font-semibold ml-2">
                                            {section.title}
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-1 screen744:!grid-cols-2 screen1280:!grid-cols-1 gap-[16px] mb-[16px]">
                                        {getPartsForSection(section.route).map((p) => {
                                            return (
                                                <button
                                                    key={p.index}
                                                    onClick={() => {
                                                        setShowModal(false);
                                                        router.push(
                                                            `/exams/exam_${examId}/part${p.index.toString()}`
                                                        );
                                                    }}
                                                    className={`${partId === p.index ? "bg-[#F7F9FF]" : "bg-white"
                                                        } w-full min-h-[60px] cursor-pointer  h-auto text-left border border-[#D5D6D8]  hover:bg-[#F7F9FF] transition-colors rounded-[12px] p-[12px]`}
                                                >
                                                    <div className="text-[14px] text-[#37465C] font-medium leading-[28px]">
                                                        {p.title}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col screen744:!flex-row flex-wrap  justify-between my-[24px] w-full h-auto min-h-[56px] gap-[20px]">
                    <div className="flex gap-[10px]  screen744:!gap-[40px] items-center">
                        <span className="shrink-0">
                            Exam {examNumber ?? (examName ?? "").match(/\d+/)?.[0] ?? ""}
                        </span>
                        <div className="flex gap-[10px]">
                            <a
                                className="relative rounded-[24px] flex-wrap px-[16px] shrink-0   text-[14px] font-normal border-[1px] bg-white flex items-center justify-center border-[#76808F] max-w-[186px] w-full h-[40px]"
                                href={`/exams/exam_${examId}/results?partNumber=part${partId}${searchParams.get("attemptId") &&
                                    searchParams.get("attemptId") !== "null"
                                    ? `&attemptId=${searchParams.get("attemptId")}`
                                    : ""
                                    }`}
                            >
                                <span className="flex">View Answers &amp; Score</span>
                            </a>
                            <AskBeavoButton
                                className="screen744:block hidden screen744:!right-6 screen744:!left-auto screen744:!translate-x-0 screen744:!fixed screen744:!bottom-6 screen1280:!left-1/2 screen1280:!right-auto screen1280:!-translate-x-1/2"
                            />
                        </div>
                    </div>
                    <div
                        onClick={() => setShowModal(true)}
                        className="max-w-[442px] justify-between cursor-pointer border px-[16px] border-[#D5D6D8] rounded-[12px] gap-[4px] w-full flex items-center h-[56px]"
                    >
                        <div className="text-[#37465C] text-[16px]">
                            <span className="font-normal">{examPractice} Part{partId}:</span>
                            <span className="font-bold">{PRACTICE_PARTS[partId - 1]}</span>
                        </div>
                        <SvgChevronDownExam className="text-[#37465C]" />
                    </div>
                </div >
            </>
        );
    }
);

ExamHeader.displayName = "ExamHeader";

export default ExamHeader;
