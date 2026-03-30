"use client";

import { SignUpButton, useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import QuestionOption from "./QuestionOption";
import { TQuestion } from "@/models/question.model";

interface ListeningAnswerListProps {
  questions: TQuestion[];
  onAnswerSelect: (questionId: number, answerId: string) => void;
  selectedAnswers: Record<string, string>;
  questionIndex: number;
}

/** Support keys stored as index ("0".."n"), numeric access, or question.id from API. */
function userAnswerFor(
  selectedAnswers: Record<string, string>,
  question: TQuestion,
  index: number
): string | undefined {
  return (
    selectedAnswers[index] ??
    selectedAnswers[String(index)] ??
    selectedAnswers[question.id]
  );
}

const ListeningAnswerList = ({
  questions,
  selectedAnswers,
}: ListeningAnswerListProps) => {
  const { isLoaded, isSignedIn } = useUser();

  const isAnswerCorrect = (questionId: number, answerId: string) => {
    const question = questions[questionId];
    if (!question) return false;
    return question.answer === answerId;
  };

  const numberOfCorrect = questions.filter(
    (q, index) =>
      userAnswerFor(selectedAnswers, q, index) &&
      q.answer === userAnswerFor(selectedAnswers, q, index)
  ).length;
  const numberOfWrong = questions.filter(
    (q, index) => {
      const ua = userAnswerFor(selectedAnswers, q, index);
      return ua !== undefined && q.answer !== ua;
    }
  ).length;
  const notAnswered = questions.filter(
    (q, index) => userAnswerFor(selectedAnswers, q, index) === undefined
  ).length;

  const noUser = isLoaded ? !isSignedIn : false;

  const STORAGE_LAST_ATTEMPT_KEY = "celpip_reading_last_result_v1";
  const STORAGE_PENDING_IMPROVEMENT_KEY =
    "celpip_reading_pending_improvement_v1";

  const [improvementDelta, setImprovementDelta] = useState<number | null>(null);
  const [showSavedImprovement, setShowSavedImprovement] = useState(false);

  const scorePayload = useMemo(() => {
    return {
      correct: numberOfCorrect,
      wrong: numberOfWrong,
      notAnswered,
      total: questions.length,
      attemptAt: Date.now(),
    };
  }, [numberOfCorrect, numberOfWrong, notAnswered, questions.length]);

  const savePendingImprovement = () => {
    if (typeof window === "undefined") return;
    try {
      const rawLast = window.localStorage.getItem(STORAGE_LAST_ATTEMPT_KEY);
      const last = rawLast
        ? (JSON.parse(rawLast) as { correct?: number })
        : null;

      const lastCorrect = typeof last?.correct === "number" ? last.correct : null;
      const delta =
        lastCorrect === null ? null : scorePayload.correct - lastCorrect;

      window.localStorage.setItem(
        STORAGE_PENDING_IMPROVEMENT_KEY,
        JSON.stringify({
          ...scorePayload,
          improvementDelta: delta,
        })
      );

      window.localStorage.setItem(
        STORAGE_LAST_ATTEMPT_KEY,
        JSON.stringify({
          correct: scorePayload.correct,
          wrong: scorePayload.wrong,
          notAnswered: scorePayload.notAnswered,
          total: scorePayload.total,
          attemptAt: scorePayload.attemptAt,
        })
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed saving reading results for improvement", e);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(
        STORAGE_PENDING_IMPROVEMENT_KEY
      );
      if (!raw) return;

      const parsed = JSON.parse(raw) as { improvementDelta?: number | null };
      setImprovementDelta(
        typeof parsed.improvementDelta === "number"
          ? parsed.improvementDelta
          : null
      );
      setShowSavedImprovement(true);
      window.localStorage.removeItem(STORAGE_PENDING_IMPROVEMENT_KEY);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed loading pending reading improvement", e);
    }
  }, [isLoaded, isSignedIn]);

  const signupKeepResultCard = (marginClass: string) => (
    <div
      className={`${marginClass} border border-[#D5D6D8] rounded-[12px] bg-white px-[16px] py-[14px]`}
    >
      <div className="text-[#212E42] font-semibold text-[16px]">
        Sign up to keep your result
      </div>
      <div className="text-[#76808F] mt-[6px] text-[14px] font-normal">
        Create a free account to track your improvement over time.
      </div>
      <div className="mt-[12px]">
        <SignUpButton>
          <div
            className="text-[14px] cursor-pointer flex items-center justify-center text-white bg-[#4A7DFF] rounded-[24px] h-[40px] w-full text-center font-normal"
            onClick={() => savePendingImprovement()}
          >
            Sign up
          </div>
        </SignUpButton>
      </div>
    </div>
  );

  return (
    <div className="w-full">
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
              Correct:
              {numberOfCorrect}
            </div>
            <div className="min-h-[36px]  justify-center leading-[20px] rounded-[28px] flex items-center px-[16px] bg-[#FFE2E8] text-[#EE4266] text-[14px] font-medium flex-1 screen744:!flex-initial">
              Wrong: {numberOfWrong}
            </div>
            <div className="min-h-[36px]  justify-center w-full screen744:!w-fit leading-[20px] rounded-[28px] flex items-center px-[16px] bg-[#E6E6E6] text-[#212E42] text-[14px] font-medium screen744:!flex-initial">
              Not answered:
              {notAnswered}
            </div>
          </div>
        </div>

        {noUser && signupKeepResultCard("mt-[16px]")}

        {!noUser && showSavedImprovement && (
          <div className="mt-[16px] border border-[#D5D6D8] rounded-[12px] bg-white px-[16px] py-[14px]">
            <div className="text-[#212E42] font-semibold text-[16px]">
              Saved! Your improvement is captured.
            </div>
            <div className="text-[#76808F] mt-[6px] text-[14px] font-normal">
              {improvementDelta === null ? (
                <>
                  Great work this time. Your next try will show improvement.
                </>
              ) : improvementDelta > 0 ? (
                <>You improved by {improvementDelta} correct answers.</>
              ) : improvementDelta < 0 ? (
                <>
                  You&apos;re {Math.abs(improvementDelta)} correct answers away
                  from your last score.
                </>
              ) : (
                <>Your score matched your last attempt.</>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-[24px]">
          {questions.map((question, index) => {
            const ua = userAnswerFor(selectedAnswers, question, index);
            return (
              <div key={question.id + String(index)} className="">
                <div className="text-[12px] screen744:!text-[16px] font-normal">
                  <span className="text-[#76808F]">Question {index + 1}:</span>

                  <span className="text-[#37465C]"> {question.question}</span>

                  {ua === undefined && (
                    <span className="bg-[#E6E6E6] items-center inline-flex rounded-[24px] text-[11px] text-[#212E42] h-[24px] px-[12px] ml-1">
                      Not answered
                    </span>
                  )}
                  {ua !== undefined && question.answer === ua && (
                    <span className="bg-[#F0FFFD]  items-center inline-flex text-[11px] rounded-[24px] h-[24px] px-[12px] text-[#0DAA94] ml-1">
                      Correct
                    </span>
                  )}
                  {ua !== undefined && question.answer !== ua && (
                    <span className="bg-[#FFE2E8] items-center inline-flex rounded-[24px] text-[11px] h-[24px] px-[12px] text-[#EE4266] ml-1">
                      Wrong
                    </span>
                  )}
                </div>

                <div className="flex flex-col mt-[12px]">
                  {question.choices
                    .filter(
                      (option) =>
                        (ua !== undefined && ua === option.id) ||
                        question.answer === option.id
                    )
                    .map((option, optIndex, arr) => (
                      <QuestionOption
                        key={option.id}
                        option={option}
                        questionId={question.id}
                        isLastItem={optIndex === arr.length - 1}
                        isSelected={ua === option.id}
                        showResults={true}
                        isCorrect={isAnswerCorrect(index, option.id)}
                        onClick={() => {}}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        {noUser && signupKeepResultCard("mt-[24px]")}
      </div>
    </div>
  );
};

export default ListeningAnswerList;
