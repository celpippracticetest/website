import QuestionOption from "./QuestionOption";
import { TQuestion } from "@/models/question.model";
import AudioPlayer from "./AudioPlayer";
import QuestionPlayer from "./QuestionPlayer";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ListeningQuestionListProps {
  question: TQuestion;
  onAnswerSelect: (questionId: number, answerId: string) => void;
  selectedAnswers: Record<string, string>;
  questionIndex: number;
  totalQuestions: number;
}

const ListeningQuestionList = ({
  question,
  onAnswerSelect,
  selectedAnswers,
  questionIndex,
  totalQuestions,
}: ListeningQuestionListProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="grid grid-cols-1 screen1280:!grid-cols-2 shrink-0 w-full h-full grow divide-y screen1280:!divide-y-0 screen1280:!divide-x divide-slate-300">
      <div className="p-6  flex screen1280:!block flex-col items-center">
        <p className="text-[18px] text-[#212E42] font-semibold ">
          Listen to the question.
        </p>
        <p className="text-[16px] mt-[10px] text-[#37465C] font-regular">
          You will hear it only once.
        </p>
        {question && (
          <QuestionPlayer
            audioUrl={question.audioUrl}
            maxPlays={2}
            className="mb-4"
          />
        )}
        <div className="flex w-full items-center screen1280:!items-start  flex-col mt-6 max-w-[450px] mx-auto">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`${
              isOpen ? "!bg-[#F2F6FF] " : " bg-white "
            } w-full border flex justify-center border-[#76808F] items-center rounded-[24px] borderitems-center cursor-pointer max-w-[153px] h-[40px] text-[14px] font-medium text-[#212E42]`}
          >
            {isOpen ? "Hide Transcript" : "Show Transcript"}
          </button>

          {isOpen && (
            <div className="w-full mx-auto mt-[16px] border border-[#D5D6D8] rounded-[12px]">
              <div className="">
                <div className="max-w-[450px] flex flex-col gap-[16px] p-[16px]">
                  {question.question}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-[5px]">
          <p className="mt-[39px] px-[16px] py-[8px]  text-[#F4845F] font-medium leading-[24px]  w-full bg-[#FFF7EE] rounded-[8px]">
            In the official test, you can't rewind or replay the audio, and
            there's no transcript.
          </p>
        </div>
      </div>
      <div className=" p-6  h-full shrink-0">
        <div
          key={question.id}
          className="border-b pb-6 last:border-b-0 last:pb-0"
        >
          <p className="text-[14px] font-medium text-[#37465C]">
            Question {questionIndex} of {totalQuestions}
          </p>
          <p className="text-[14px] font-semibold text-[#212E42] mt-[8px]">
            Choose the best answer to the question.
          </p>
          <div className="flex flex-col mt-[16px] gap-[8px]">
            {question.choices.map((option, index) => (
              <QuestionOption
                key={option.id}
                option={option}
                questionId={question.id}
                isSelected={selectedAnswers[questionIndex - 1] === option.id}
                showResults={false}
                isCorrect={false}
                onClick={() => onAnswerSelect(questionIndex, option.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListeningQuestionList;
