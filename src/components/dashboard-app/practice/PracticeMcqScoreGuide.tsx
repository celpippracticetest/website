"use client";

import {
  getMcqScoreBand,
  getMcqSkillTips,
  McqSkill,
} from "@/lib/practiceResultGuide";
import { TQuestion } from "@/models/question.model";
import PracticeAiMcqFeedback from "./PracticeAiMcqFeedback";

interface PracticeMcqScoreGuideProps {
  skill: McqSkill;
  correct: number;
  total: number;
  wrong: number;
  notAnswered: number;
  practiceId?: string;
  taskName?: string;
  questions?: TQuestion[];
  selectedAnswers?: Record<string, string>;
  passageExcerpt?: string;
}

export default function PracticeMcqScoreGuide({
  skill,
  correct,
  total,
  wrong,
  notAnswered,
  practiceId,
  taskName,
  questions,
  selectedAnswers,
  passageExcerpt,
}: PracticeMcqScoreGuideProps) {
  const band = getMcqScoreBand(correct, total);
  const skillTips = getMcqSkillTips(skill);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const canFetchAi =
    practiceId &&
    questions &&
    questions.length > 0 &&
    selectedAnswers &&
    Object.keys(selectedAnswers).length > 0;

  return (
    <div className="mt-[16px] border border-[#D5D6D8] rounded-[12px] bg-white overflow-hidden">
      <div className="px-[16px] py-[14px] bg-[#F4F7FF] border-b border-[#D5D6D8]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#212E42] font-semibold text-[16px]">
            {skill} result guide
          </span>
          <span className="text-[12px] rounded-full bg-white px-[10px] py-[2px] text-[#37465C] border border-[#D5D6D8]">
            {pct}% · {band.clbHint}
          </span>
        </div>
        <div className="text-[#76808F] mt-[4px] text-[14px] font-medium">
          {band.label}
        </div>
      </div>

      <div className="px-[16px] py-[14px] flex flex-col gap-[12px]">
        <p className="text-[14px] text-[#37465C] leading-relaxed">
          {band.summary}
        </p>

        <div>
          <div className="text-[13px] font-semibold text-[#212E42] mb-[8px] uppercase tracking-wide">
            Quick tips
          </div>
          <ul className="flex flex-col gap-[8px]">
            {band.tips.map((tip) => (
              <li
                key={tip}
                className="text-[14px] text-[#37465C] leading-relaxed pl-[12px] border-l-2 border-[#0DAA94]"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-[13px] font-semibold text-[#212E42] mb-[8px] uppercase tracking-wide">
            {skill}-specific strategy
          </div>
          <ul className="flex flex-col gap-[6px]">
            {skillTips.map((tip) => (
              <li key={tip} className="text-[14px] text-[#37465C] leading-relaxed">
                • {tip}
              </li>
            ))}
          </ul>
        </div>

        {notAnswered > 0 && (
          <div className="rounded-[8px] bg-[#FFF5EF] border border-[#FFDCC0] px-[12px] py-[10px] text-[14px] text-[#37465C]">
            You left {notAnswered} question{notAnswered === 1 ? "" : "s"}{" "}
            blank. On test day, always eliminate options and guess—unanswered
            items score zero.
          </div>
        )}

        {wrong > 0 && (
          <div className="rounded-[8px] bg-[#F0F6FF] border border-[#D6E6FF] px-[12px] py-[10px] text-[14px] text-[#37465C]">
            Review the {wrong} missed question{wrong === 1 ? "" : "s"} below.
            Read each explanation before retrying this practice.
          </div>
        )}

        {canFetchAi && (
          <PracticeAiMcqFeedback
            skill={skill}
            practiceId={practiceId}
            taskName={taskName}
            correct={correct}
            total={total}
            wrong={wrong}
            notAnswered={notAnswered}
            questions={questions}
            selectedAnswers={selectedAnswers}
            passageExcerpt={passageExcerpt}
          />
        )}
      </div>
    </div>
  );
}
