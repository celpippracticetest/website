"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useModalTracking } from "@/hooks/useTracking";

interface ContinueExamModalProps {
  onContinue: () => void;
  onFinish: () => void;
  onViewResults?: () => void;
  completedSectionName?: string;
  nextSectionName: string;
}

const ContinueExamModal = ({
  onContinue,
  onFinish,
  onViewResults,
  completedSectionName,
  nextSectionName,
}: ContinueExamModalProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(90); // 90 seconds = 1:30 minutes
  const { viewed, closed } = useModalTracking();

  useEffect(() => {
    // Track modal viewed
    viewed("Continue Exam Modal", "exam_part_completion");

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-navigate to exams page when timer expires
          closed("Continue Exam Modal", "auto_dismissed");
          router.push("/exam-overview");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, viewed, closed]);

  const handleContinue = () => {
    closed("Continue Exam Modal", "completed");
    onContinue();
  };

  const handleFinish = () => {
    closed("Continue Exam Modal", "completed");
    onFinish();
  };

  const handleViewResults = () => {
    if (!onViewResults) return;
    closed("Continue Exam Modal", "completed");
    onViewResults();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="z-[999] fixed top-0 items-center left-0 px-[14px] right-0 bottom-0 overflow-y-auto bg-[#17161680] backdrop-blur-sm flex justify-center">
      <div
        ref={ref}
        className="flex-col relative w-full h-auto max-w-[480px] p-[32px] rounded-[24px] bg-white shadow-2xl flex items-center justify-center gap-6 animate-in fade-in zoom-in duration-300"
      >
        {/* Timer Badge */}
        <div className="absolute -top-4 right-6 bg-gradient-to-r from-[#4A7DFF] to-[#316BFF] text-white px-4 py-2 rounded-full shadow-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-semibold text-sm">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4A7DFF] to-[#316BFF] flex items-center justify-center shadow-lg">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-3 text-[#37465C]">
            Section Completed! 🎉
          </h3>
          <p className="text-[#76808F] text-base leading-relaxed">
            Great job! Review your {completedSectionName ?? "section"} results,
            continue to <strong className="text-[#4A7DFF]">{nextSectionName}</strong>,
            or return to the exams page.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col w-full gap-3">
          {onViewResults && completedSectionName && (
            <button
              onClick={handleViewResults}
              className="w-full py-3.5 bg-white border-2 border-[#4A7DFF] text-[#316BFF] rounded-xl font-semibold hover:bg-[#F2F6FF] hover:scale-[1.02] transition-all duration-200"
            >
              View {completedSectionName} Results
            </button>
          )}
          <button
            onClick={handleContinue}
            className="w-full py-3.5 bg-gradient-to-r from-[#4A7DFF] to-[#316BFF] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
          >
            Continue to {nextSectionName}
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
          <button
            onClick={handleFinish}
            className="w-full py-3.5 bg-[#F2F6FF] text-[#37465C] rounded-xl font-semibold hover:bg-[#E5ECFF] transition-all duration-200 hover:scale-[1.02]"
          >
            Back to Exams Page
          </button>
        </div>

        {/* Auto-redirect notice */}
        <p className="text-xs text-[#76808F] text-center">
          Automatically redirecting to exams page in {formatTime(timeLeft)}
        </p>
      </div>
    </div>
  );
};

export default ContinueExamModal;
