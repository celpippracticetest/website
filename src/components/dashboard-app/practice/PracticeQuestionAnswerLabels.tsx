"use client";

import { TQuestion } from "@/models/question.model";

interface PracticeQuestionAnswerLabelsProps {
  question: TQuestion;
  userAnswerId?: string;
}

function choiceText(question: TQuestion, choiceId: string | undefined) {
  if (!choiceId) return null;
  return question.choices.find((c) => c.id === choiceId)?.text ?? choiceId;
}

export default function PracticeQuestionAnswerLabels({
  question,
  userAnswerId,
}: PracticeQuestionAnswerLabelsProps) {
  const userText = choiceText(question, userAnswerId);
  const correctText = choiceText(question, question.answer);

  if (!userAnswerId && !correctText) return null;

  return (
    <div className="mt-[8px] flex flex-col gap-[4px] text-[13px] screen744:!text-[14px]">
      {userAnswerId !== undefined && (
        <p className="text-[#EE4266] font-medium">
          Your answer:{" "}
          <span className="font-normal text-[#37465C]">
            {userText ?? "—"}
          </span>
        </p>
      )}
      {userAnswerId !== question.answer && correctText && (
        <p className="text-[#0DAA94] font-medium">
          Correct answer:{" "}
          <span className="font-normal text-[#37465C]">{correctText}</span>
        </p>
      )}
    </div>
  );
}
