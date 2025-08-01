"use client";
import { useEffect, useState } from "react";
import { useListeningPracticeCompletion } from "./hooks/useListeningPracticeCompletion";
import { TPracticeDto } from "@/models/practice.model";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import SpeakingPracticeView from "./SpeakingPracticeView";
import SpeakingAnswerModal from "./AnswerModal";
import ListeningTaskView from "../listening-practice/ListeningTaskView";
import { useUser } from "@clerk/nextjs";
import { TTaskSchemaDto } from "@/models/tasks.model";

interface SpeakingPracticeProps {
  showHeader?: boolean;
  allPractices: TPracticeDto[];
  selectedPractice: TPracticeDto | null;
  task: TTaskSchemaDto;
  completedPracticeId: string[];
}

const SpeakingPractice = ({
  showHeader = true,
  allPractices,
  selectedPractice,
  task,
  completedPracticeId,
}: SpeakingPracticeProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPracticeId = searchParams.get("selectedPracticeId");
  const selectedTaskId = searchParams.get("taskId");

  useEffect(() => {
    if (!selectedPracticeId && !selectedTaskId) {
      router.push("/practice-overview");
    }
  }, [selectedPracticeId, selectedTaskId, router]);

  const { completedPractices, handlePracticeComplete } =
    useListeningPracticeCompletion();
  const [isAnswerModalOpen, setAnswerModalOpen] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const { user } = useUser();
  const shouldShowPractice =
    (selectedPractice && selectedPractice.isFree) ||
    (selectedPractice &&
      !selectedPractice.isFree &&
      user &&
      user.publicMetadata.plan &&
      user.publicMetadata.plan === "premium");
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
        onNextPractice={() => handleNavigateToNextPractice(selectedPractice.id)}
        completedPractice={completedPracticeId}
      />
      <SpeakingAnswerModal
        isAnswerModalOpen={isAnswerModalOpen}
        setAnswerModalOpen={setAnswerModalOpen}
        result={result}
      />
    </>
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
