"use client";
import { TPracticeDto } from "@/models/practice.model";
import { useSearchParams } from "next/navigation";
import ReadingPracticeView from "./ReadingPracticeView";
import { TTaskSchemaDto } from "@/models/tasks.model";
import ListeningTaskView from "../listening-practice/ListeningTaskView";
import { useRouter } from "nextjs-toploader/app";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { useEffect } from "react";

interface ReadingPracticeProps {
  showHeader?: boolean;
  allPractices: TPracticeDto[];
  selectedPractice: TPracticeDto | null;
  task: TTaskSchemaDto;
  previousAnswer: TListeningAndReadingAnswerDto | null;
  completedPractice: string[];
  routePracticeId?: string;
  routeTaskId?: string;
  /** Page already SSR'd task picker heading (Reading/Listening hub with ?taskId=). */
  hideTaskPickerHeader?: boolean;
}

const ReadingPractice = ({
  showHeader = true,
  allPractices,
  selectedPractice,
  task,
  previousAnswer,
  completedPractice,
  routePracticeId,
  routeTaskId,
  hideTaskPickerHeader = false,
}: ReadingPracticeProps) => {
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

  const handleBackToPracticeList = () => {
    router.push("/practice-overview");
  };

  return selectedPractice ? (
    <div className="flex flex-col mx-auto  w-full max-w-[1280px] pb-[200px]">
      <ReadingPracticeView
        practice={selectedPractice}
        task={task}
        allPractices={allPractices}
        selectedPracticeId={selectedPracticeId}
        selectedTaskId={selectedTaskId}
        onBackClick={handleBackToPracticeList}
        previousAnswer={previousAnswer}
        completedPractice={completedPractice}
        hideLegacyBreadcrumb={Boolean(routePracticeId)}
      />
    </div>
  ) : (
    <ListeningTaskView
      allPractices={allPractices}
      task={task}
      completedPractice={completedPractice}
      title={"Reading"}
      hideHeader={hideTaskPickerHeader}
    />
  );
};

export default ReadingPractice;
