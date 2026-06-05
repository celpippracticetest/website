"use client";
import { useEffect, useState } from "react";
import { useListeningPracticeCompletion } from "./hooks/useListeningPracticeCompletion";
import { TPracticeDto, TPracticeNavItem } from "@/models/practice.model";
import { useSearchParams } from "next/navigation";
import WritingPracticeView from "./WritingPracticeView";
import WritingAnswerModal from "./answerModal";
import type { TWritingAnswerDto } from "@/models/answer";
import { TTaskSchemaDto } from "@/models/tasks.model";
import ListeningTaskView from "../listening-practice/ListeningTaskView";
import { useRouter } from "nextjs-toploader/app";
import { practicePath, taskPickerPath } from "@/lib/practiceRoutes";

interface WritingPracticeProps {
  showHeader?: boolean;
  allPractices: TPracticeNavItem[];
  selectedPractice: TPracticeDto | null;
  task: TTaskSchemaDto;
  completedPracticeId: string[];
  initialWritingAnswers?: TWritingAnswerDto[];
  routePracticeId?: string;
  routeTaskId?: string;
  totalWritingAnswerCount?: number;
}

const WritingPractice = ({
  allPractices,
  selectedPractice,
  task,
  completedPracticeId,
  initialWritingAnswers = [],
  routePracticeId,
  routeTaskId,
  totalWritingAnswerCount = 0,
}: WritingPracticeProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPracticeId =
    routePracticeId ?? searchParams.get("selectedPracticeId");
  const selectedTaskId = routeTaskId ?? searchParams.get("taskId");
  const { handlePracticeComplete } = useListeningPracticeCompletion();
  const [isAnswerModalOpen, setAnswerModalOpen] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);

  const onAnswerButtonClick = (
    practice: TPracticeDto,
    result: Record<string, any>
  ) => {
    setAnswerModalOpen(true);
    setResult(result);
  };

  useEffect(() => {
    if (!selectedPracticeId && !selectedTaskId) {
      router.push("/practice-overview");
    }
  }, [selectedPracticeId, selectedTaskId, router]);

  const handleBackToPracticeList = () => {
    if (selectedTaskId) {
      router.push(taskPickerPath("writing", selectedTaskId));
      return;
    }
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
    router.push(practicePath("writing", nextPractice.id, selectedTaskId));
  };

  return (
    <div className="animate-fadeIn space-y-6 md:space-y-8 px-[16px] screen744:!px-0">
      {selectedPractice ? (
        <>
          <WritingPracticeView
            onAnswerButtonClick={onAnswerButtonClick}
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
            task={task}
            completedPracticeId={completedPracticeId}
            initialWritingAnswers={initialWritingAnswers}
            routePracticeId={routePracticeId}
            totalWritingAnswerCount={totalWritingAnswerCount}
          />
          <WritingAnswerModal
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
          title={"Writing"}
          selectedTaskId={selectedTaskId}
        />
      )}
    </div>
  );
};

export default WritingPractice;
