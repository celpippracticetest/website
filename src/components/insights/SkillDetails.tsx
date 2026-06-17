import { Headphones, Mic, Pen, BookOpen } from "lucide-react";
import QuestionResults from "./QuestionResults";
import { SkillData } from "./skillTypes";

type SkillDetailsProps = {
  activeTab: string;
  skillData: SkillData;
};

const SkillDetails = ({ activeTab, skillData }: SkillDetailsProps) => {
  const skillIcons = {
    speaking: <Mic className="h-5 w-5" />,
    writing: <Pen className="h-5 w-5" />,
    reading: <BookOpen className="h-5 w-5" />,
    listening: <Headphones className="h-5 w-5" />,
  };

  return (
    <div className="p-4">
      <p className="text-gray-700 mb-4 font-medium text-[14px] md:text-[14px]">
        {skillData.description}
      </p>

      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h4 className="font-semibold text-[14px] mb-3 text-gray-700">
          Performance Metrics
        </h4>
        <QuestionResults results={skillData.questionResults} />
      </div>
    </div>
  );
};

export default SkillDetails;
