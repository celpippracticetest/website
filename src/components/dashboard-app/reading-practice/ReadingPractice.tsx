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
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";

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
    <div className="flex flex-col mx-auto  w-full ">
      <div className="pl-[40px] text-[#76808F] text-[14px] mt-[24px] mb-[28px] items-center flex gap-[8px]">
        <div
          onClick={() => {
            router.push("/practice-overview");
          }}
        >
          Practice
        </div>
        <SvgChevronRightForTitle />
        <div
          onClick={() => {
            router.push("/reading");
          }}
        >
          Reading
        </div>
        <SvgChevronRightForTitle />{" "}
        <span className="text-[#212E42]">
          <span className="text-[#76808F]">
            {task.taskNumber?.replace(" #", "")}
          </span>
          .{task.name}
        </span>
      </div>
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
    </div>
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
