"use client";

import { TExamSchemaDto } from "@/models/exam.model";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef, useState } from "react";
import LoginModal from "../modal/LoginModal";
import UpgradeModal from "../modal/UpgradeModal";
import { hasMockExamAccess } from "@/lib/subscriptionAccess";
import { isFreeGuestMockExam } from "@/lib/freeMockExam";
import {
  createMockExamAttemptId,
  readRememberedMockExamAttemptId,
  rememberMockExamAttemptId,
} from "@/lib/mockExamAttemptId";
import type { ExamProgressSummary } from "@/lib/examOverviewProgress";
import SvgLock from "../icons/Lock";
import { cn } from "@/lib/utils";

const ExamOverview = ({
  exams,
  progressByExamId = {},
}: {
  exams: TExamSchemaDto[];
  progressByExamId?: Record<string, ExamProgressSummary>;
}) => {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  const plan = user?.publicMetadata?.plan as string | undefined;
  const noUser = isLoaded ? !isSignedIn : false;

  const canAccessExam = (examId: string) =>
    hasMockExamAccess(
      plan,
      user?.publicMetadata?.purchaseDate,
      examId,
      null,
      user?.publicMetadata?.purchasedMockExamIds,
    );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { setSelectedExam } = useSelectedExam();

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        setShowUpgradeModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [noUser]);

  const handleStart = (
    exam: TExamSchemaDto,
    partId: number = 1,
    section?: string,
  ) => {
    if (!isLoaded) {
      return;
    }
    const freeExam = isFreeGuestMockExam(exam);
    if (noUser && !freeExam) {
      setShowLoginModal(true);
      return;
    }
    if (!freeExam && !canAccessExam(exam.id)) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedExam(exam.name);
    const remembered = readRememberedMockExamAttemptId(exam.id);
    const progress = progressByExamId[exam.id];
    const attemptId =
      remembered && progress && progress.completedParts > 0
        ? remembered
        : createMockExamAttemptId();
    rememberMockExamAttemptId(exam.id, attemptId);
    const query = section
      ? `?section=${section}&attemptId=${attemptId}`
      : `?attemptId=${attemptId}`;
    router.push(`/exams/exam_${exam.id}/part${partId}${query}`);
  };


  return (
    <main
      className={`w-full pt-[24px] mx-auto max-w-[1280px] px-[16px] screen744:!px-0`}
    >
      {showUpgradeModal ? (
        <UpgradeModal setShowModal={setShowUpgradeModal} />
      ) : noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}
      <div className="grid grid-cols-1 min-[440px]:grid-cols-2 screen1024:!grid-cols-3 screen1280:!grid-cols-4 gap-[14px] screen744:!gap-[16px] pb-[24px]">
        {exams.map((exam: TExamSchemaDto, i: number) => {
          const freeExam = isFreeGuestMockExam(exam);
          const locked =
            isLoaded && isSignedIn && !freeExam && !canAccessExam(exam.id);
          const progress = progressByExamId[exam.id];
          const hasProgress = Boolean(
            progress && progress.completedParts > 0,
          );
          const isComplete = Boolean(
            progress &&
            progress.totalParts > 0 &&
            progress.completedParts >= progress.totalParts,
          );
          const { title, number, year } = parseExamName(exam.name, i);
          const primaryLabel = locked
            ? "Unlock with Premium"
            : isComplete
              ? "Review test"
              : hasProgress
                ? "Resume test"
                : "Start full test";

          return (
            <article
              key={exam.id ?? i}
              aria-label={exam.name}
              className={cn(
                "group relative flex flex-col gap-[12px] screen744:!gap-[14px] p-[16px] screen744:!p-[18px] rounded-[18px] bg-white border",
                "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                "hover:-translate-y-[3px] hover:shadow-[0_16px_32px_-20px_rgba(37,84,214,0.45)]",
                isComplete
                  ? "border-[#BFE9DD] hover:border-[#8FD8C3]"
                  : hasProgress
                    ? "border-[#C9D5F5] hover:border-[#9DB4F2]"
                    : "border-[#E8EEFB] hover:border-[#C9D5F5]",
              )}
            >
              {/* Number tile + status */}
              <div className="flex items-start justify-between gap-[10px]">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex shrink-0 items-center justify-center w-[38px] h-[38px] text-[14px] screen744:!w-[44px] screen744:!h-[44px] screen744:!text-[16px] rounded-[12px] font-extrabold tracking-[-0.02em]",
                    "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-3 group-hover:scale-105 motion-reduce:transition-none",
                    locked
                      ? "bg-[#F1F3F7] text-[#8A94A6]"
                      : isComplete
                        ? "bg-[#E3F8F5] text-[#0B7D64]"
                        : "bg-[#EEF3FF] text-[#2554D6]",
                  )}
                >
                  {number}
                </span>
                <StatusBadge
                  free={freeExam}
                  locked={locked}
                  complete={isComplete}
                  inProgress={hasProgress && !isComplete}
                />
              </div>

              {/* Title + meta */}
              <div className="flex flex-col gap-[4px]">
                <h3 className="m-0 flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-[16px] leading-[22px] screen744:!text-[17px] font-semibold text-[#212E42]">
                  {title}
                  {year && (
                    <span className="flex items-center h-[20px] px-[7px] rounded-full bg-[#FFF4E5] text-[#B4471F] text-[11px] font-bold">
                      {year}
                    </span>
                  )}
                </h3>
                <p className="m-0 flex items-center gap-[6px] text-[13px] leading-[18px] text-[#5B6B82]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="13" r="8" />
                    <path d="M12 9v4l2 2M9 2h6" />
                  </svg>
                  4 skills · about 3 hrs
                </p>
              </div>

              {/* Progress */}
              {hasProgress && !locked && (
                <div className="flex flex-col gap-[6px]">
                  <div className="flex items-center justify-between text-[12px] font-medium text-[#5B6B82]">
                    <span>
                      {isComplete
                        ? "All parts completed"
                        : `${progress?.completedParts} of ${progress?.totalParts} parts done`}
                    </span>
                    <span className={isComplete ? "text-[#0B7D64]" : "text-[#2554D6]"}>
                      {Math.min(100, progress?.completionPercentage ?? 0)}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${exam.name} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, progress?.completionPercentage ?? 0)}
                    className="h-[6px] w-full rounded-full bg-[#EEF1F6] overflow-hidden"
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isComplete ? "bg-[#0F9F7F]" : "bg-[linear-gradient(90deg,#4A7DFF,#2554D6)]",
                      )}
                      style={{ width: `${Math.min(100, progress?.completionPercentage ?? 0)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-auto flex flex-col gap-[12px]">
                {/* Primary action */}
                <button
                  type="button"
                  onClick={() => handleStart(exam, 1)}
                  className={cn(
                    "flex items-center justify-center gap-[8px] h-[44px] w-full rounded-full text-[14px] font-semibold whitespace-nowrap cursor-pointer",
                    "transition-[transform,background-color,box-shadow,color] duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#759CFF] focus-visible:outline-offset-2",
                    locked
                      ? "bg-[#F4F0FF] text-[#6D28D9] hover:bg-[#EBE3FF]"
                      : isComplete
                        ? "bg-white text-[#2554D6] border-[1.5px] border-[#C9D5F5] hover:border-[#2554D6]"
                        : hasProgress || freeExam
                          ? // Resume / the free test: the strongest action on the page.
                            "bg-[#2554D6] text-white shadow-[3px_3px_0_0_#759CFF] hover:bg-[#1E46B8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_#759CFF]"
                          : // Other starts stay soft so 60 cards don't shout; solid on card hover.
                            "bg-[#EEF3FF] text-[#2554D6] shadow-[0_0_0_0_#759CFF] group-hover:bg-[#2554D6] group-hover:text-white group-hover:shadow-[3px_3px_0_0_#759CFF] hover:bg-[#1E46B8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_#759CFF]",
                  )}
                >
                  {locked ? (
                    <SvgLock className="w-[16px] h-[16px] [&_path]:stroke-current" />
                  ) : isComplete ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                    </svg>
                  )}
                  {primaryLabel}
                </button>

                {/* Section shortcuts */}
                <div className="flex flex-col gap-[6px]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A94A6]">
                    Or practise one section
                  </span>
                  <div className="grid grid-cols-4 gap-[6px]">
                    {examSections.map((section) => (
                      <button
                        key={section.key}
                        type="button"
                        disabled={locked}
                        title={locked ? "Premium mock test" : `Start ${section.label}`}
                        aria-label={`Start ${section.label} section of ${exam.name}`}
                        onClick={() => handleStart(exam, section.partId, section.key)}
                        className={cn(
                          "group/sec flex flex-col items-center justify-center gap-[3px] h-[44px] screen744:!h-[50px] rounded-[10px] text-[11px] font-semibold",
                          "transition-[transform,background-color] duration-200 motion-reduce:transition-none",
                          "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#759CFF] focus-visible:outline-offset-2",
                          locked
                            ? "bg-[#F5F6F8] text-[#A0A8B4] cursor-not-allowed"
                            : cn(section.tile, "cursor-pointer hover:-translate-y-[2px] active:translate-y-0"),
                        )}
                      >
                        <span className="w-[18px] h-[18px] transition-transform duration-200 group-hover/sec:scale-110">
                          {section.icon}
                        </span>
                        <span className="max-[439px]:hidden screen1024:!hidden min-[1180px]:!inline">{section.short}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
};

/** "Mock Test 3 (2026)" -> { title: "Mock Test 3", number: "03", year: "2026" }. */
function parseExamName(name: string, index: number) {
  const year = name.match(/\((\d{4})\)/)?.[1] ?? null;
  const title = name.replace(/\s*\(\d{4}\)\s*/, " ").trim();
  const digits = title.match(/(\d+)\s*$/)?.[1] ?? String(index + 1);
  return { title, year, number: digits.padStart(2, "0") };
}

const StatusBadge = ({
  free,
  locked,
  complete,
  inProgress,
}: {
  free: boolean;
  locked: boolean;
  complete: boolean;
  inProgress: boolean;
}) => {
  const badge = complete
    ? { label: "Completed", className: "bg-[#E3F8F5] text-[#0B7D64]" }
    : inProgress
      ? { label: "In progress", className: "bg-[#EEF3FF] text-[#2554D6]" }
      : locked
        ? { label: "Premium", className: "bg-[#F1E9FE] text-[#6D28D9]" }
        : free
          ? { label: "Free", className: "bg-[#E7F8F2] text-[#0B7D64]" }
          : null;
  if (!badge) return null;
  return (
    <span className={cn("flex items-center gap-[4px] h-[24px] px-[10px] rounded-full text-[12px] font-semibold whitespace-nowrap", badge.className)}>
      {locked && !complete && !inProgress && <SvgLock className="w-[12px] h-[12px] [&_path]:stroke-current" />}
      {inProgress && <span className="w-[6px] h-[6px] rounded-full bg-current animate-pulse motion-reduce:animate-none" aria-hidden="true" />}
      {badge.label}
    </span>
  );
};

const sectionStroke = {
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

// Same part ids the old dropdown used; colours match the homepage skill tiles.
const examSections = [
  {
    key: "listening",
    label: "Listening",
    short: "Listen",
    partId: 1,
    tile: "bg-[#EEF3FF] text-[#1D4ED8] hover:bg-[#E3EBFF]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
        <path {...sectionStroke} d="M3 14v-2a9 9 0 0 1 18 0v2" />
        <rect {...sectionStroke} x="3" y="14" width="4" height="6" rx="1.5" />
        <rect {...sectionStroke} x="17" y="14" width="4" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    key: "reading",
    label: "Reading",
    short: "Read",
    partId: 7,
    tile: "bg-[#FFF0F3] text-[#B91C1C] hover:bg-[#FFE2E8]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
        <path {...sectionStroke} d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5zM12 6.5v13" />
      </svg>
    ),
  },
  {
    key: "writing",
    label: "Writing",
    short: "Write",
    partId: 11,
    tile: "bg-[#EBFAF7] text-[#0D9488] hover:bg-[#E3F8F5]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
        <path {...sectionStroke} d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
      </svg>
    ),
  },
  {
    key: "speaking",
    label: "Speaking",
    short: "Speak",
    partId: 13,
    tile: "bg-[#FFF3E6] text-[#BE123C] hover:bg-[#FFEBD6]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
        <rect {...sectionStroke} x="9" y="3" width="6" height="11" rx="3" />
        <path {...sectionStroke} d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    ),
  },
];

export default ExamOverview;
