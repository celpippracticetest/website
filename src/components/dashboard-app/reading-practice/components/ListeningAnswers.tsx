import { useState } from "react";
import { ListeningQuestion } from "../types/ListeningPractice";
import QuestionOption from "./QuestionOption";
import { TQuestion } from "@/models/question.model";
import AudioPlayer from "./AudioPlayer";

interface ListeningAnswerListProps {
  questions: TQuestion[];
  onAnswerSelect: (questionId: number, answerId: string) => void;
  selectedAnswers: Record<string, string>;
  questionIndex: number;
}

const ListeningAnswerList = ({
  questions,
  onAnswerSelect,
  selectedAnswers,
  questionIndex,
}: ListeningAnswerListProps) => {
  const isAnswerCorrect = (questionId: number, answerId: string) => {
    const question = questions[questionId];
    if (!question) return false;
    return question.answer === answerId;
  };
  const numberOfCorrect = questions.filter(
    (q, index) => selectedAnswers[index] && q.answer === selectedAnswers[index]
  ).length;
  const numberOfWrong = questions.filter(
    (q, index) => selectedAnswers[index] && q.answer !== selectedAnswers[index]
  ).length;
  const notAnswered = questions.filter(
    (q, index) => selectedAnswers[index] === undefined
  ).length;

  return (
    <div className="w-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-gray-100">
      <div className="p-[16px] screen744:!p-[24px]">
        <div className="flex flex-col screen744:!flex-row px-[16px] p-[12px] rounded-[12px] border h-auto min-h-[60px] border-[#D5D6D8] justify-between items-start screen744:!items-center">
          <div className="text-lg mb-2 font-regular">
            <div className="h-[28px] flex items-center">
              <span className="text-[16px] font-normal text-[#37465C]">
                Results:
              </span>
              <span className="font-bold text-[18px] text-[#212E42]">
                {numberOfCorrect}/{questions.length}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-center lg:text-left text-[14px] text-gray-900 font-regular w-full">
            <div className="min-h-[36px]  justify-center leading-[20px] rounded-[28px] flex items-center px-[16px] bg-[#F0FFFD] text-[#0DAA94] text-[14px] font-medium flex-1 screen744:!flex-initial">
              Correct: {numberOfCorrect}
            </div>
            <div className="min-h-[36px]  justify-center leading-[20px] rounded-[28px] flex items-center px-[16px] bg-[#FFE2E8] text-[#EE4266] text-[14px] font-medium flex-1 screen744:!flex-initial">
              Wrong: {numberOfWrong}
            </div>
            <div className="min-h-[36px]  justify-center w-full screen744:!w-fit leading-[20px] rounded-[28px] flex items-center px-[16px] bg-[#E6E6E6] text-[#212E42] text-[14px] font-medium screen744:!flex-initial">
              Not answered: {notAnswered}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-[24px]">
          {questions.map((question, index) => (
            <div key={index} className="">
              <div className=" text-[16px] font-normal ">
                <span className="text-[#76808F]">Question {index + 1}:</span>

                <span className="text-[#37465C]"> {question.question}</span>

                {selectedAnswers[index] === undefined && (
                  <span className="bg-[#E6E6E6] items-center inline-flex rounded-[24px] text-[11px] text-[#212E42] h-[24px] px-[12px]">
                    Not answered
                  </span>
                )}
                {selectedAnswers[index] &&
                  question.answer === selectedAnswers[index] && (
                    <span className="bg-[#F0FFFD]  items-center inline-flex text-[11px] rounded-[24px] h-[24px] px-[12px] text-[#0DAA94]">
                      Correct
                    </span>
                  )}
                {selectedAnswers[index] &&
                  question.answer !== selectedAnswers[index] && (
                    <span className="bg-[#FFE2E8] items-center inline-flex rounded-[24px] text-[11px] h-[24px] px-[12px] text-[#EE4266]">
                      Wrong
                    </span>
                  )}
              </div>

              <div className="flex flex-col mt-[12px]">
                {question.choices
                  .filter(
                    (option) =>
                      (selectedAnswers[index] &&
                        selectedAnswers[index] === option.id) ||
                      question.answer === option.id
                  )
                  .map((option) => (
                    <QuestionOption
                      key={option.id}
                      option={option}
                      questionId={question.id}
                      isLastItem={index === questions.length - 1}
                      isSelected={selectedAnswers[index] === option.id}
                      showResults={true}
                      isCorrect={isAnswerCorrect(index, option.id)}
                      onClick={() => {}}
                    />
                  ))}
              </div>
            </div>
          ))}
          {/* {questions.map((question, index) => {
            return (
              <div key={index} className="overflow-hidden p-4 border rounded-lg border-slate-300 shadow-sm">
                <p className="font-semibold text-[14px] mb-2 text-gray-900">
                  {question.id}. {question.question}
                  <span className="ml-2 text-xs font-semibold rounded-full px-2 py-1 text-rose-700 bg-rose-100">
                    Wrong
                  </span>
                </p>
                <div className="text-[14px] space-y-1 font-bold">
                  <p className="text-rose-700">
                    Your answer: <span className="font-medium text-gray-700">To cancel his appointment completely</span>
                  </p>
                  <p className="text-emerald-700">
                    <b>Correct answer:</b>{" "}
                    <span className="font-medium text-gray-700">To change his appointment time</span>
                  </p>
                </div>
              </div>
            );
          })} */}
        </div>
      </div>
    </div>
  );
};

export default ListeningAnswerList;
