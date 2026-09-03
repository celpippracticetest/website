"use client";
import { TPracticeDto } from "@/models/practice.model";
import ReadingPracticeView from "./ReadingPracticeView";
import { TTaskSchemaDto } from "@/models/tasks.model";
import ListeningTaskView from "../listening-practice/ListeningTaskView";
import { useRouter } from "nextjs-toploader/app";
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";
import { usePracticeDeepLinkParams } from "@/hooks/usePracticeDeepLinkParams";
import { taskPickerPath } from "@/lib/practiceRoutes";
import { TListeningAndReadingAnswerDto } from "@/models/answer";

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
  const { selectedPracticeId, taskId: selectedTaskId } = usePracticeDeepLinkParams();

  const handleBackToPracticeList = () => {
    if (task.id) {
      router.push(taskPickerPath("reading", task.id));
      return;
    }
    router.push("/practice-overview");
  };

  return selectedPractice ? (
    <div className="flex flex-col mx-auto  w-full max-w-[1280px]">
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
            router.push(taskPickerPath("reading", task.id));
          }}
        >
          Reading
        </div>
        <SvgChevronRightForTitle />
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
