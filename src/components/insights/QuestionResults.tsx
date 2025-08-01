import { CheckCircle2 } from "lucide-react";
import { QuestionResult } from "./skillTypes";

type QuestionResultsProps = {
  results: QuestionResult[];
};

const QuestionResults = ({ results }: QuestionResultsProps) => {
  return (
    <div className="space-y-2">
      {results.map((result, index) => (
        <div
          key={index}
          className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-[14px] text-gray-700">{result.type}</span>
          </div>
          <span className="font-medium text-gray-900 bg-gray-100 px-3 py-1 rounded-full text-[14px]">
            {result.score}
          </span>
        </div>
      ))}
    </div>
  );
};

export default QuestionResults;
