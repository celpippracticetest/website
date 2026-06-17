"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight } from "lucide-react";
import SvgListening from "../icons/Listening";
import SvgReading from "../icons/Reading";
import SvgWriting from "../icons/Writing";
import SvgSpeaking from "../icons/Speaking";

interface IncompletePart {
    name: string;
    startPart: number;
}

interface IncompletePartsModalProps {
    isOpen: boolean;
    onClose: () => void;
    incompleteParts: IncompletePart[];
    examId: string;
}

const IncompletePartsModal: React.FC<IncompletePartsModalProps> = ({
    isOpen,
    onClose,
    incompleteParts,
    examId,
}) => {
    const router = useRouter();

    if (!isOpen || incompleteParts.length === 0) return null;

    const handleCompleteParts = () => {
        // Navigate to the first incomplete section
        const firstIncompletePart = incompleteParts[0];
        router.push(`/exams/exam_${examId}/part${firstIncompletePart.startPart}`);
    };

    const handleBackToExams = () => {
        router.push("/exam-overview");
    };

    const getSectionIcon = (sectionName: string) => {
        const icons: Record<string, any> = {
            Listening: <SvgListening />,
            Reading: <SvgReading />,
            Writing: <SvgWriting />,
            Speaking: <SvgSpeaking />,
        };
        return icons[sectionName] || "📝";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                        <AlertCircle className="w-8 h-8 text-white" />
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-[#37465C] mb-2">
                        Incomplete Exam
                    </h2>
                    <p className="text-[#76808F] text-base">
                        You haven't completed all sections of this exam yet.
                    </p>
                </div>

                {/* Incomplete Sections List */}
                <div className="mb-6 hidden screen744:block">
                    <p className="text-sm font-semibold text-[#37465C] mb-3">
                        Missing sections (click to start):
                    </p>
                    <div className="space-y-2">
                        {incompleteParts.map((part, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    router.push(`/exams/exam_${examId}/part${part.startPart}`);
                                }}
                                className="w-full flex items-center gap-3 p-3 bg-[#F2F6FF] rounded-xl hover:bg-[#E5ECFF] transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                            >
                                <span className="text-2xl">{getSectionIcon(part.name)}</span>
                                <span className="text-[#37465C] font-medium flex-1 text-left">
                                    {part.name}
                                </span>
                                <ChevronRight className="w-5 h-5 text-[#76808F]" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message */}
                <p className="text-center text-sm text-[#76808F] mb-6">
                    Complete all sections to get your full exam score and detailed
                    feedback.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleCompleteParts}
                        className="w-full py-3.5 bg-gradient-to-r from-[#4A7DFF] to-[#316BFF] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        Complete Missing Parts
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-[#0DAA94] text-white rounded-xl font-semibold hover:bg-[#0c9581] transition-all duration-200 hover:scale-[1.02] "
                    >
                        View Results Anyway
                    </button>
                    <button
                        onClick={handleBackToExams}
                        className="w-full py-3.5 bg-[#F2F6FF] text-[#37465C] rounded-xl font-semibold hover:bg-[#E5ECFF] transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    >
                        Back to Exams
                    </button>
                </div>

                {/* Dismiss hint */}
                <p className="text-xs text-center text-[#76808F] mt-4">
                    Click outside to dismiss
                </p>
            </div>
        </div>
    );
};

export default IncompletePartsModal;
