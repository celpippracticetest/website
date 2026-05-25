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
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import type { TWritingAnswerDto } from "@/models/answer";
import type { SpeakingPracticeInitialAuth } from "./types";
import { practicePath } from "@/lib/practiceRoutes";

export type { SpeakingPracticeInitialAuth };

interface SpeakingPracticeProps {
  showHeader?: boolean;
  allPractices: TPracticeNavItem[];
  selectedPractice: TPracticeDto | null;
  task: TTaskSchemaDto;
  completedPracticeId: string[];
  initialSpeakingAnswers?: TWritingAnswerDto[];
  routePracticeId?: string;
  routeTaskId?: string;
  initialAuth?: SpeakingPracticeInitialAuth;
}

const SpeakingPractice = ({
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

  const { handlePracticeComplete } = useListeningPracticeCompletion();
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
      currentPracticeIndex >= allPractices.length - 1 ||
      !selectedTaskId
    ) {
      return;
    }

    const nextPractice = allPractices[currentPracticeIndex + 1];
    router.push(practicePath("speaking", nextPractice.id, selectedTaskId));
  };

  return (
    <div className="animate-fadeIn space-y-6 md:space-y-8 px-[16px] screen744:!px-0">
      {selectedPractice ? (
        <>
          <SpeakingPracticeView
            onAnswerButtonClick={onAnswerButtonClick}
            task={task}
            practice={selectedPractice}
            allPractices={allPractices}
            selectedPracticeId={selectedPracticeId}
            selectedTaskId={selectedTaskId}
            onBackClick={handleBackToPracticeList}
            onComplete={() => handlePracticeComplete(selectedPractice.id)}
            onUpgrade={() => {}}
            onNextPractice={() =>
              handleNavigateToNextPractice(selectedPractice.id)
            }
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
        </>
      ) : (
        <ListeningTaskView
          allPractices={allPractices}
          task={task}
          completedPractice={completedPracticeId}
          title={"Speaking"}
          selectedTaskId={selectedTaskId}
        />
      )}
    </div>
  );
};

export default SpeakingPractice;
