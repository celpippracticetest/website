import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Target } from "lucide-react";
import { FeedbackItem } from "./skillTypes";

type AIFeedbackProps = {
  feedback: FeedbackItem[];
  focusAreas: string[];
};

const AIFeedback = ({ feedback, focusAreas }: AIFeedbackProps) => {
  return (
    <div className="p-4">
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <h4 className="font-semibold text-lg mb-4 text-gray-700">
          AI Feedback
        </h4>

        <div className="space-y-6">
          {feedback.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <h4 className="font-medium text-[14px] text-gray-500">
                  {item.label}
                </h4>
                <div className="flex-grow"></div>
                <span className="text-gray-900 font-bold">{item.score}/10</span>
              </div>
              <Progress value={item.score * 10} className="h-2 bg-gray-200" />
              <p className="text-[14px] text-gray-600 mt-1">
                {item.description}
              </p>
            </div>
          ))}

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <h4 className="font-medium text-[14px] text-gray-500">
                FOCUS AREAS
              </h4>
            </div>
            <ul className="space-y-2 mt-3">
              {focusAreas.map((area, index) => (
                <li
                  key={index}
                  className="text-[14px] text-gray-600 flex items-start gap-2"
                >
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFeedback;
