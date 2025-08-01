"use client";
import { useListeningPracticeCompletion } from "./hooks/useListeningPracticeCompletion";
import { TPracticeDto } from "@/models/practice.model";
import { redirect, RedirectType, useSearchParams } from "next/navigation";
import ReadingPracticeView from "./ReadingPracticeView";
import { TTaskSchemaDto } from "@/models/tasks.model";
import ListeningTaskView from "../listening-practice/ListeningTaskView";
import { useRouter } from "nextjs-toploader/app";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { useEffect } from "react";

interface ReadingPracticeProps {
  allPractices: TPracticeDto[];
  selectedPractice: TPracticeDto | null;
  task: TTaskSchemaDto;
  previousAnswer: TListeningAndReadingAnswerDto | null;
  completedPractice: string[];
}

const ReadingPractice = ({
  allPractices,
  selectedPractice,
  task,
  previousAnswer,
  completedPractice,
}: ReadingPracticeProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPracticeId = searchParams.get("selectedPracticeId");
  const selectedTaskId = searchParams.get("taskId");

  useEffect(() => {
    if (!selectedPracticeId && !selectedTaskId) {
      router.push("/practice-overview");
    }
  }, [selectedPracticeId, selectedTaskId, router]);

  const handleBackToPracticeList = () => {
    router.push("/practice-overview");
  };

  return selectedPractice ? (
    <ReadingPracticeView
      practice={selectedPractice}
      task={task}
      allPractices={allPractices}
      selectedPracticeId={selectedPracticeId}
      selectedTaskId={selectedTaskId}
      onBackClick={handleBackToPracticeList}
      previousAnswer={previousAnswer}
      completedPractice={completedPractice}
    />
  ) : (
    <ListeningTaskView
      allPractices={allPractices}
      task={task}
      completedPractice={completedPractice}
      title={"Reading"}
    />
  );
};

export default ReadingPractice;
