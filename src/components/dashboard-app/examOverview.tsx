"use client";

import { TExamSchemaDto } from "@/models/exam.model";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef, useState } from "react";
import LoginModal from "../modal/LoginModal";
import UpgradeModal from "../modal/UpgradeModal";
import { hasMockExamAccess } from "@/lib/subscriptionAccess";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import {
  createMockExamAttemptId,
  readRememberedMockExamAttemptId,
  rememberMockExamAttemptId,
} from "@/lib/mockExamAttemptId";
import type { ExamProgressSummary } from "@/lib/examOverviewProgress";
import SvgLock from "../icons/Lock";

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
    if (noUser) {
      setShowLoginModal(true);
      return;
    }
    if (!canAccessExam(exam.id)) {
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
      <div className="w-full  flex flex-col gap-4">
        <div className="flex flex-wrap w-full gap-[16px] pb-[10px]">
          {exams.map((exam: TExamSchemaDto, i: number) => {
            const locked = isLoaded && isSignedIn && !canAccessExam(exam.id);
            const progress = progressByExamId[exam.id];
            const hasProgress = Boolean(
              progress && progress.completedParts > 0,
            );
            const isComplete = Boolean(
              progress &&
                progress.totalParts > 0 &&
                progress.completedParts >= progress.totalParts,
            );
            const startLabel = isComplete
              ? "Review"
              : hasProgress
                ? "Resume"
                : "Start";
            return (
              <div
                key={i}
                className="flex grow basis-0 min-w-[calc(50%-8px)] screen744:min-w-[calc(25%-12px)] max-w-full screen744:max-w-[calc(25%-12px)] rounded-[12px] min-h-[124px] py-3 bg-white overflow-hidden cursor-pointer items-center justify-center flex-col hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-[12px] justify-center flex-col w-full px-2">
                  <p className=" text-[#37465C]  font-medium text-center w-full">
                    {exam.name}
                  </p>
                  {locked ? (
                    <div className="flex items-center gap-1 rounded-full bg-[#F1E9FE] px-3 py-1 text-[12px] font-semibold text-[#7C3AED]">
                      <SvgLock />
                      Premium
                    </div>
                  ) : hasProgress ? (
                    <div className="w-full max-w-[160px]">
                      <div className="mb-1 flex justify-between text-[11px] text-[#76808F]">
                        <span>
                          {isComplete ? "Completed" : `${progress?.completedParts}/${progress?.totalParts} parts`}
                        </span>
                        <span>{progress?.completionPercentage}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#E6E6E6]">
                        <div
                          className="h-1.5 rounded-full bg-[#4A7DFF]"
                          style={{
                            width: `${Math.min(100, progress?.completionPercentage ?? 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="w-[112px] text-[14px] font-[14px] hover:!bg-[#4A7DFF] hover:!text-white flex items-center justify-center text-[#76808F] h-[40px] bg-[#F3F2F2] rounded-[24px] transition-colors cursor-pointer">
                          {startLabel}{" "}
                          {locked ? (
                            <SvgLock className="h-4 w-4 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="center"
                        className="w-48 bg-white"
                      >
                        <DropdownMenuItem
                          onClick={() => handleStart(exam, 1)}
                          className="cursor-pointer"
                        >
                          Complete Test
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStart(exam, 1, "listening")}
                          className="cursor-pointer"
                        >
                          Listening
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStart(exam, 7, "reading")}
                          className="cursor-pointer"
                        >
                          Reading
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStart(exam, 11, "writing")}
                          className="cursor-pointer"
                        >
                          Writing
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStart(exam, 13, "speaking")}
                          className="cursor-pointer"
                        >
                          Speaking
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default ExamOverview;
