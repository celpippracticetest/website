"use client";
import { useEffect, useState } from "react";
import SpeakingPracticeView from "./SpeakingPracticeView";
import { useListeningPracticeCompletion } from "./hooks/useListeningPracticeCompletion";
import { TPracticeDto, TPracticeNavItem } from "@/models/practice.model";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import SpeakingAnswerModal from "./AnswerModal";
import ListeningTaskView from "../listening-practice/ListeningTaskView";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { TTaskSchemaDto } from "@/models/tasks.model";
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import type { TWritingAnswerDto } from "@/models/answer";

export type SpeakingPracticeInitialAuth = {
  isSignedIn: boolean;
  plan: string;
  purchaseDate?: string;
};

interface SpeakingPracticeProps {
  showHeader?: boolean;
  allPractices: TPracticeNavItem[];
  selectedPractice: TPracticeDto | null;
  task: TTaskSchemaDto;
  completedPracticeId: string[];
  initialSpeakingAnswers?: TWritingAnswerDto[];
  /** When set (path-based URL), use these instead of search params and hide duplicate crumb row. */
  routePracticeId?: string;
  routeTaskId?: string;
  /** Server-resolved auth so the client does not wait on Supabase getUser(). */
  initialAuth?: SpeakingPracticeInitialAuth;
}

const SpeakingPractice = ({
  showHeader = true,
  allPractices,
  selectedPractice,
  task,
  completedPracticeId,
  initialSpeakingAnswers,
  routePracticeId,
  routeTaskId,
  initialAuth,
}: SpeakingPracticeProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPracticeId =
    routePracticeId ?? searchParams.get("selectedPracticeId");
  const selectedTaskId = routeTaskId ?? searchParams.get("taskId");

  useEffect(() => {
    if (!selectedPracticeId && !selectedTaskId) {
      router.push("/practice-overview");
    }
  }, [selectedPracticeId, selectedTaskId, router]);

  const { completedPractices, handlePracticeComplete } =
    useListeningPracticeCompletion();
  const [isAnswerModalOpen, setAnswerModalOpen] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const { user } = useHybridWebUser();
  const shouldShowPractice =
    (selectedPractice && selectedPractice.isFree) ||
    (selectedPractice &&
      !selectedPractice.isFree &&
      hasPaidPracticeAccess(
        user?.publicMetadata.plan as string | undefined,
        user?.publicMetadata.purchaseDate as string | undefined
      ));
  const onAnswerButtonClick = (
    practice: TPracticeDto,
    result: Record<string, any>
  ) => {
    if (shouldShowPractice) {
      setAnswerModalOpen(true);
      setResult(result);
    }
  };

  const handleBackToPracticeList = () => {
    router.push("/practice-overview");
  };

  const handleNavigateToNextPractice = (currentPracticeId: string) => {
    const currentPracticeIndex = allPractices.findIndex(
      (p) => p.id === currentPracticeId
    );

    if (
      currentPracticeIndex === -1 ||
      currentPracticeIndex >= allPractices.length - 1
    ) {
      return; // No next practice available
    }

    const nextPractice = allPractices[currentPracticeIndex + 1];

    // All practices are free
    // setSelectedPracticeId(nextPractice.id);
  };

  return selectedPractice ? (
    <div className="flex flex-col w-full max-w-[1280px]">
      {!routePracticeId && (
        <div className="pl-[40px] text-[#76808F] text-[14px] mt-[24px] mb-[28px] items-center flex gap-[8px]">
          <div
            className="cursor-pointer"
            onClick={() => {
              router.push("/practice-overview");
            }}
          >
            Practice
          </div>
          <SvgChevronRightForTitle />
          <div
            className="cursor-pointer"
            onClick={() => {
              router.push("/speaking");
            }}
          >
            Speaking
          </div>
          <SvgChevronRightForTitle />
          <span className="text-[#212E42]">
            <span className="text-[#76808F]">
              {task.taskNumber?.replace(" #", "")}
            </span>
            .{task.name}
          </span>
        </div>
      )}

      <SpeakingPracticeView
        onAnswerButtonClick={onAnswerButtonClick}
        task={task}
        practice={selectedPractice}
        allPractices={allPractices}
        selectedPracticeId={selectedPracticeId}
        selectedTaskId={selectedTaskId}
        onBackClick={handleBackToPracticeList}
        onComplete={() => handlePracticeComplete(selectedPractice.id)}
        onUpgrade={() => { }}
        onNextPractice={() => handleNavigateToNextPractice(selectedPractice.id)}
        completedPractice={completedPracticeId}
        initialSpeakingAnswers={initialSpeakingAnswers}
        initialAuth={initialAuth}
      />
      <SpeakingAnswerModal
        isAnswerModalOpen={isAnswerModalOpen}
        setAnswerModalOpen={setAnswerModalOpen}
        result={result}
        taskContent={selectedPractice?.passages[0].body}
      />
    </div>
  ) : (
    <ListeningTaskView
      task={task}
      allPractices={allPractices}
      completedPractice={completedPracticeId}
      title={"Speaking"}
    />
  );
};

export default SpeakingPractice;
