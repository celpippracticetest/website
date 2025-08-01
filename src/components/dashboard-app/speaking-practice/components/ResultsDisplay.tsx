import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface ResultsDisplayProps {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  onBackClick: () => void;
  onNextPractice: () => void;
}

const ResultsDisplay = ({
  score,
  correctAnswers,
  totalQuestions,
  onBackClick,
  onNextPractice,
}: ResultsDisplayProps) => {
  return (
    <div className="mt-6 space-y-4">
      <div className="p-4 border rounded-lg bg-blue-50 border-blue-100 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-[#212121]">Your Score</h4>
          <p className="text-[14px] text-[#424242]">
            You got {correctAnswers} out of {totalQuestions} correct
          </p>
        </div>
        <div className="text-3xl font-bold text-blue-600">{score}%</div>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          className="border-gray-200"
          onClick={onBackClick}
        >
          Back to List
        </Button>

        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={onNextPractice}
        >
          Next Practice <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ResultsDisplay;
