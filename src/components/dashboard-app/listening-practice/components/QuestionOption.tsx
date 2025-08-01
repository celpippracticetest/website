import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgCircle from "@/components/icons/Circle";
import { cn } from "@/lib/utils";

interface QuestionOptionProps {
  option: {
    id: string;
    text: string;
  };
  questionId: string;
  isSelected: boolean;
  showResults: boolean;
  isCorrect: boolean;
  onClick: () => void;
  isLastItem?: boolean;
}

const QuestionOption = ({
  option,
  isSelected,
  showResults,
  isCorrect,
  isLastItem,
  onClick,
}: QuestionOptionProps) => {
  const isUserSelection = isSelected;
  const isWrongSelection = showResults && isUserSelection && !isCorrect;

  return (
    <>
      <div
        className={cn(
          "rounded-lg cursor-pointer  ",
          isSelected && "bg-[#F2F6FF]",
          showResults && isCorrect ? "border-green-400 bg-white" : "",
          isWrongSelection ? "border-red-400 bg-white" : ""
        )}
        onClick={onClick}
      >
        <div className="flex h-[36px] items-center  gap-[8px] pl-[4px] cursor-pointer ">
          {!showResults && isSelected && (
            <SvgCheckCircle className=" shrink-0 " />
          )}
          {!showResults && !isSelected && <SvgCircle className=" shrink-0" />}
          {showResults && isCorrect && (
            <span className="text-[12px] screen744:!text-[16px] text-[#0DAA94] font-medium ">
              Correct answer:
            </span>
          )}
          {showResults && !isCorrect && (
            <span className="text-[12px] screen744:!text-[16px] text-[#EE4266] font-medium ">
              Your answer:
            </span>
          )}
          <div className="flex-1 text-[12px] screen744:!text-[16px]">
            {option.text}
          </div>
        </div>
      </div>
    </>
  );
};

export default QuestionOption;
