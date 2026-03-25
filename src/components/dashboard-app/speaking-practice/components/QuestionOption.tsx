import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgCircle from "@/components/icons/Circle";
import { cn } from "@/lib/utils";
import CheckCircle from "@mui/icons-material/CheckCircle";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircle from "@mui/icons-material/CheckCircle";

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
}

const QuestionOption = ({
  option,
  questionId,
  isSelected,
  showResults,
  isCorrect,
  onClick,
}: QuestionOptionProps) => {
  const isUserSelection = isSelected;
  const isWrongSelection = showResults && isUserSelection && !isCorrect;

  return (
    <div
      className={cn(
        " cursor-pointer min-h-[36px] pb-[10px] pl-[4px] flex items-center text-[14px] text-[#212E42] rounded-[8px] leading-[20px]",
        isSelected ? "bg-[#F2F6FF]" : "",
        showResults && isCorrect ? "border-green-400 bg-white" : "",
        isWrongSelection ? "border-red-400 bg-white" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-center p-2 rounded-md transition-all ">
        {!showResults && isSelected && (
          <SvgCheckCircle className=" shrink-0 mr-2" />
        )}
        {!showResults && !isSelected && (
          <SvgCircle className=" shrink-0 mr-2" />
        )}
        {showResults && isCorrect && (
          <b className="text-emerald-700">Correct answer:</b>
        )}
        {showResults && !isCorrect && (
          <b className="text-rose-700">Your answer:</b>
        )}
        <div className="px-2 text-[14px] text-[#212E42] font-normal">
          {option.text}
        </div>

        {/* {showResults && isCorrect && <CheckCircle className="h-5 w-5 text-green-600 ml-2" />} */}
      </div>
    </div>
  );
};

export default QuestionOption;
