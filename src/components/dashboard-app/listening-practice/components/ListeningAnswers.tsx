"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QuestionOption from "./QuestionOption";
import { TQuestion } from "@/models/question.model";
import PracticeMcqScoreGuide from "../../practice/PracticeMcqScoreGuide";
import PracticeQuestionAnswerLabels from "../../practice/PracticeQuestionAnswerLabels";
import PracticeQuestionExplanation from "../../practice/PracticeQuestionExplanation";

interface ListeningAnswerListProps {
  questions: TQuestion[];
  onAnswerSelect: (questionId: number, answerId: string) => void;
  selectedAnswers: Record<string, string>;
  questionIndex: number;
  practiceId?: string;
  taskName?: string;
  passageExcerpt?: string;
}

const ListeningAnswerList = ({
  questions,
  selectedAnswers,
  practiceId,
  taskName,
  passageExcerpt,
}: ListeningAnswerListProps) => {
  const { isLoaded, isSignedIn } = useHybridWebUser();

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

  const noUser = isLoaded ? !isSignedIn : false;

  const STORAGE_LAST_ATTEMPT_KEY = "celpip_listening_last_result_v1";
  const STORAGE_PENDING_IMPROVEMENT_KEY =
    "celpip_listening_pending_improvement_v1";

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
      // Non-blocking: CTA should still work even if storage fails.
      // eslint-disable-next-line no-console
      console.warn("Failed saving listening results for improvement", e);
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
        typeof parsed.improvementDelta === "number" ? parsed.improvementDelta : null
      );
      setShowSavedImprovement(true);
      // One-time banner; keep last attempt for future deltas.
      window.localStorage.removeItem(STORAGE_PENDING_IMPROVEMENT_KEY);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed loading pending listening improvement", e);
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
        <Link href="/sign-in?mode=sign-up" onClick={() => savePendingImprovement()}>
          <div className="text-[14px] cursor-pointer flex items-center justify-center text-white bg-[#4A7DFF] rounded-[24px] h-[40px] w-full text-center font-normal">
            Sign up
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="w-full  ">
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

        <PracticeMcqScoreGuide
          skill="Listening"
          correct={numberOfCorrect}
          total={questions.length}
          wrong={numberOfWrong}
          notAnswered={notAnswered}
          practiceId={practiceId}
          taskName={taskName}
          questions={questions}
          selectedAnswers={selectedAnswers}
          passageExcerpt={passageExcerpt}
        />

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
                  You're {Math.abs(improvementDelta)} correct answers away from
                  your last score.
                </>
              ) : (
                <>Your score matched your last attempt.</>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-[24px]">
          {questions.map((question, index) => (
            <div key={index} className="">
              <div className=" text-[12px] screen744:!text-[16px] font-normal ">
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

              <PracticeQuestionAnswerLabels
                question={question}
                userAnswerId={selectedAnswers[index]}
              />

              <div className="flex flex-col mt-[12px]">
                {question.choices
                  .filter(
                    (option) =>
                      (selectedAnswers[index] &&
                        selectedAnswers[index] === option.id) ||
                      question.answer === option.id
                  )
                  .map((option, optIndex, arr) => (
                    <QuestionOption
                      key={option.id}
                      option={option}
                      questionId={question.id}
                      isLastItem={optIndex === arr.length - 1}
                      isSelected={selectedAnswers[index] === option.id}
                      showResults={true}
                      isCorrect={isAnswerCorrect(index, option.id)}
                      onClick={() => {}}
                    />
                  ))}
              </div>

              {question.description && (
                <PracticeQuestionExplanation
                  description={question.description}
                  variant={
                    selectedAnswers[index] !== undefined &&
                    selectedAnswers[index] !== question.answer
                      ? "wrong"
                      : "tip"
                  }
                />
              )}
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

        {noUser && signupKeepResultCard("mt-[24px]")}
      </div>
    </div>
  );
};

export default ListeningAnswerList;
