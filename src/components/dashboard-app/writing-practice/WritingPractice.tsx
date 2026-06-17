"use client";
import { useEffect, useState } from "react";
// import { allListeningPractices } from "./data";
import { useListeningPracticeCompletion } from "./hooks/useListeningPracticeCompletion";
import { TPracticeDto } from "@/models/practice.model";
import { useSearchParams } from "next/navigation";
import WritingPracticeView from "./WritingPracticeView";
import WritingAnswerModal from "./answerModal";
import { TTaskSchemaDto } from "@/models/tasks.model";
import ListeningTaskView from "../listening-practice/ListeningTaskView";
import { useRouter } from "nextjs-toploader/app";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";

interface WritingPracticeProps {
  showHeader?: boolean;
  allPractices: TPracticeDto[];
  selectedPractice: TPracticeDto | null;
  task: TTaskSchemaDto;
  completedPracticeId: string[];
}

const WritingPractice = ({
  showHeader = true,
  allPractices,
  selectedPractice,
  task,
  completedPracticeId,
}: WritingPracticeProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPracticeId = searchParams.get("selectedPracticeId");
  const selectedTaskId = searchParams.get("taskId");
  const { completedPractices, handlePracticeComplete } =
    useListeningPracticeCompletion();
  const [isAnswerModalOpen, setAnswerModalOpen] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const { user } = useHybridWebUser();
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

  useEffect(() => {
    if (!selectedPracticeId && !selectedTaskId) {
      router.push("/practice-overview");
    }
  }, [selectedPracticeId, selectedTaskId, router]);

  const handleBackToPracticeList = () => {
    router.push("/practice-overview");
  };

  return selectedPractice ? (
    <div className="flex flex-col  w-full max-w-[1280px]">
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
            router.push("/writing");
          }}
        >
          Writing
        </div>
        <SvgChevronRightForTitle />{" "}
        <span className="text-[#212E42]">
          <span className="text-[#76808F]">
            {task.taskNumber?.replace(" #", "")}
          </span>
          .{task.name}
        </span>
      </div>
      <WritingPracticeView
        onAnswerButtonClick={onAnswerButtonClick}
        practice={selectedPractice}
        allPractices={allPractices}
        selectedPracticeId={selectedPracticeId}
        selectedTaskId={selectedTaskId}
        onBackClick={handleBackToPracticeList}
        onComplete={() => handlePracticeComplete(selectedPractice.id)}
        onUpgrade={() => { }}
        onNextPractice={() => { }}
        task={task}
        completedPracticeId={completedPracticeId}
      />
      <WritingAnswerModal
        isAnswerModalOpen={isAnswerModalOpen}
        setAnswerModalOpen={setAnswerModalOpen}
        result={result}
        taskContent={selectedPractice?.passages[0].body}
      />
    </div>
  ) : (
    <ListeningTaskView
      allPractices={allPractices}
      task={task}
      completedPractice={completedPracticeId}
      title={"Writing"}
    />
  );
};

export default WritingPractice;
