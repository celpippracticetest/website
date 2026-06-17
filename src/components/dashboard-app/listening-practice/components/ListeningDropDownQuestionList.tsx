import QuestionOption from "./QuestionOption";
import { TQuestion } from "@/models/question.model";
import AudioPlayer from "./AudioPlayer";
import QuestionPlayer from "./QuestionPlayer";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ListeningDropDownQuestionListProps {
  question: TQuestion;
  onAnswerSelect: (questionId: number, answerId: string) => void;
  selectedAnswers: Record<string, string>;
  questionIndex: number;
  totalQuestions: number;
}

const ListeningDropDownQuestionList = ({
  question,
  onAnswerSelect,
  selectedAnswers,
  questionIndex,
  totalQuestions,
}: ListeningDropDownQuestionListProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className=" mt-[16px] screen1280:!mt-[24px] px-[16px] screen1280:!px-[24px] shrink-0">
      <div key={question.id} className="border-b last:border-b-0 last:pb-0">
        <div className="grid lg:grid-cols-3 grid-cols-1 shrink-0 w-full grow">
          <p className="text-[14px] mb-[16px] screen744:!mb-0 flex items-center  col-span-2">
            <span className="text-[16px] font-semibold shrink-0 text-[#76808F]">
              {questionIndex}/{totalQuestions}
              {". "}
            </span>
            <span className="font-semibold text-[16px] text-[#212E42]">
              {" "}
              {question.question}
            </span>
          </p>
          <div className="flex flex-col gap-1">
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={
                  "w-full bg-white border border-[#E6E6E6] px-[16px] h-[48px] rounded-[16px]  text-left cursor-pointer focus:outline-none " +
                  (selectedAnswers[questionIndex - 1]
                    ? " text-slate-700 "
                    : " text-slate-400 ")
                }
              >
                {selectedAnswers[questionIndex - 1]
                  ? question.choices.find(
                      (option) =>
                        option.id === selectedAnswers[questionIndex - 1]
                    )?.text
                  : "Select an answer"}
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </span>
              </button>
              {isOpen && (
                <ul className="absolute z-10 mt-1 w-full border border-[#979EA8] bg-white max-h-60 rounded-md py-1 text-[14px]  overflow-scroll focus:outline-none">
                  {question.choices.map((option) => (
                    <li
                      key={option.id}
                      onClick={() => {
                        onAnswerSelect(questionIndex, option.id);
                        setIsOpen(false);
                      }}
                      className={`cursor-pointer select-none text-[#212E42] flex items-center relative h-[48px] px-[24px] hover:bg-[#3ebbf3]/50 ${
                        selectedAnswers[questionIndex - 1] === option.id
                          ? "text-white bg-[#3ebbf3]"
                          : "text-gray-900"
                      }`}
                    >
                      <span
                        className={`block truncate ${
                          selectedAnswers[questionIndex - 1] === option.id
                            ? "font-semibold"
                            : "font-normal"
                        }`}
                      >
                        {option.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListeningDropDownQuestionList;
