"use client";
import ListeningPracticeView from "./ListeningPracticeView";
import { useListeningPracticeCompletion } from "./hooks/useListeningPracticeCompletion";
import { TPracticeDto } from "@/models/practice.model";
import ListeningTaskView from "./ListeningTaskView";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { useRouter } from "nextjs-toploader/app";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { useEffect, useState } from "react";
import { usePracticeDeepLinkParams } from "@/hooks/usePracticeDeepLinkParams";
import { practicePath } from "@/lib/practiceRoutes";

interface ListeningPracticeProps {
  showHeader?: boolean;
  allPractices: TPracticeDto[];
  selectedPractice: TPracticeDto | null;
  task: TTaskSchemaDto;
  previousAnswer: TListeningAndReadingAnswerDto | null;
  completedPractice: string[];
}

const ListeningPractice = ({
  allPractices,
  selectedPractice,
  task,
  previousAnswer,
  completedPractice,
}: ListeningPracticeProps) => {
  const router = useRouter();
  const { selectedPracticeId, taskId: selectedTaskId } = usePracticeDeepLinkParams();
  const { handlePracticeComplete } = useListeningPracticeCompletion();
  const [isFromFirstPage, setIsFromFirstPage] = useState(false);

  useEffect(() => {
    if (!selectedPracticeId && !selectedTaskId) {
      router.push("/practice-overview");
    }
  }, [selectedPracticeId, selectedTaskId, router]);

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

    setIsFromFirstPage(false);
    router.push(practicePath("listening", nextPractice.id, selectedTaskId!));
  };

  return (
    <div className="animate-fadeIn space-y-6 md:space-y-8 px-[16px] screen744:!px-0">
      {selectedPractice ? (
        <ListeningPracticeView
          practice={selectedPractice}
          task={task}
          allPractices={allPractices}
          selectedPracticeId={selectedPracticeId}
          selectedTaskId={selectedTaskId}
          onBackClick={handleBackToPracticeList}
          onComplete={() => handlePracticeComplete(selectedPractice.id)}
          onUpgrade={() => {}}
          isFromFirstPage={isFromFirstPage}
          setIsFromFirstPage={setIsFromFirstPage}
          onNextPractice={() =>
            handleNavigateToNextPractice(selectedPractice.id)
          }
          previousAnswer={previousAnswer}
          completedPractice={completedPractice}
        />
      ) : (
        <ListeningTaskView
          allPractices={allPractices}
          completedPractice={completedPractice}
          task={task}
          title={"Listening"}
        />
      )}
    </div>
  );
};

export default ListeningPractice;
