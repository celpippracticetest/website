"use client";

import ArrowBack from "@mui/icons-material/ArrowBack";
import SvgArrowRight from "@/components/icons/ArrowRight";
import { cn } from "@/lib/utils";
import React from "react";

interface PracticeExamCardHeaderProps {
  partTitle: string;
  taskLabel: string;
  onBack: () => void;
  onNext: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
  trailingSlot?: React.ReactNode;
  className?: string;
}

const PracticeExamCardHeader = ({
  partTitle,
  taskLabel,
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
  nextLabel = "Next",
  trailingSlot,
  className,
}: PracticeExamCardHeaderProps) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-outline px-5 py-4 screen744:px-6 lg:flex-row lg:items-center lg:justify-between",
        "bg-[linear-gradient(135deg,rgba(255,235,214,0.92),rgba(255,255,255,0.98))]",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          disabled={backDisabled}
          onClick={onBack}
          className={cn(
            "inline-flex h-11 min-w-[108px] shrink-0 items-center justify-center gap-2 rounded-full border border-outline bg-transparent px-5 font-body text-sm font-bold text-text1 transition-colors",
            "hover:border-primary1/30 hover:text-primary1",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary1/30 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:text-text3 disabled:opacity-45"
          )}
        >
          <ArrowBack sx={{ fontSize: 18 }} />
          Back
        </button>

        <div className="min-w-0">
          <p className="truncate font-body text-lg font-extrabold tracking-tight text-text1 screen744:text-xl">
            {partTitle}
          </p>
          <p className="font-body text-sm text-text3">{taskLabel}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 self-stretch lg:self-auto">
        {trailingSlot}
        <button
          type="button"
          disabled={nextDisabled}
          onClick={onNext}
          className={cn(
            "inline-flex h-11 min-w-[108px] items-center justify-center gap-2 rounded-full bg-primary1 px-5 font-body text-sm font-bold text-white transition-colors",
            "hover:bg-[#255CE0]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary1/30 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:bg-outline disabled:text-text3"
          )}
        >
          {nextLabel}
          <SvgArrowRight />
        </button>
      </div>
    </div>
  );
};

export default PracticeExamCardHeader;
