"use client";

import {
  getMcqScoreBand,
  getMcqSkillTips,
  getMockExamMcqTips,
  McqSkill,
} from "@/lib/practiceResultGuide";
import { TQuestion } from "@/models/question.model";
import PracticeAiMcqFeedback from "./PracticeAiMcqFeedback";
import PracticeResultPaywall from "./PracticeResultPaywall";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { usePricingNavModal } from "@/hooks/usePricingNavModal";
import { PricingNavModal } from "@/components/pages/pricing/PricingNavModal";

interface PracticeMcqScoreGuideProps {
  skill: McqSkill;
  correct: number;
  total: number;
  wrong: number;
  notAnswered: number;
  practiceId?: string;
  /** Mock exam session id when `practiceId` is not used */
  contextId?: string;
  taskName?: string;
  questions?: TQuestion[];
  selectedAnswers?: Record<string, string> | string[];
  passageExcerpt?: string;
  context?: "practice" | "mock";
}

export default function PracticeMcqScoreGuide({
  skill,
  correct,
  total,
  wrong,
  notAnswered,
  practiceId,
  contextId,
  taskName,
  questions,
  selectedAnswers,
  passageExcerpt,
  context = "practice",
}: PracticeMcqScoreGuideProps) {
  const { user, isLoaded } = useHybridWebUser();
  const { open: pricingModalOpen, setOpen: setPricingModalOpen, openPricingModal } =
    usePricingNavModal();
  const isPro = hasPaidPracticeAccess(
    user?.publicMetadata?.plan as string | undefined,
    user?.publicMetadata?.purchaseDate as string | undefined
  );
  const lockGuide = context === "mock" && (isLoaded ? !isPro : true);

  const band = getMcqScoreBand(correct, total);
  const skillTips = getMcqSkillTips(skill);
  const mockTips = context === "mock" ? getMockExamMcqTips(skill) : [];
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const sessionId = practiceId ?? contextId;
  const hasAnswers =
    selectedAnswers &&
    (Array.isArray(selectedAnswers)
      ? selectedAnswers.some(Boolean)
      : Object.keys(selectedAnswers).length > 0);

  const canFetchAi =
    sessionId &&
    questions &&
    questions.length > 0 &&
    hasAnswers &&
    !lockGuide;

  const guideBody = (
    <div className="px-[16px] py-[14px] flex flex-col gap-[12px]">
      <p className="text-[14px] text-[#37465C] leading-relaxed">{band.summary}</p>

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

      {mockTips.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-[#212E42] mb-[8px] uppercase tracking-wide">
            Mock exam tips
          </div>
          <ul className="flex flex-col gap-[6px]">
            {mockTips.map((tip) => (
              <li key={tip} className="text-[14px] text-[#37465C] leading-relaxed">
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notAnswered > 0 && (
        <div className="rounded-[8px] bg-[#FFF5EF] border border-[#FFDCC0] px-[12px] py-[10px] text-[14px] text-[#37465C]">
          You left {notAnswered} question{notAnswered === 1 ? "" : "s"} blank. On
          test day, always eliminate options and guess—unanswered items score zero.
        </div>
      )}

      {wrong > 0 && (
        <div className="rounded-[8px] bg-[#F0F6FF] border border-[#D6E6FF] px-[12px] py-[10px] text-[14px] text-[#37465C]">
          Review the {wrong} missed question{wrong === 1 ? "" : "s"} below. Read
          each explanation before retrying this practice.
        </div>
      )}

      {canFetchAi && (
        <PracticeAiMcqFeedback
          skill={skill}
          practiceId={sessionId!}
          context={context}
          taskName={taskName}
          correct={correct}
          total={total}
          wrong={wrong}
          notAnswered={notAnswered}
          questions={questions!}
          selectedAnswers={selectedAnswers!}
          passageExcerpt={passageExcerpt}
        />
      )}
    </div>
  );

  return (
    <>
      <PricingNavModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
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

        <PracticeResultPaywall
          locked={lockGuide}
          onUpgrade={openPricingModal}
          tint="#ffffff"
          title="You're seeing half of your result guide"
          description="Upgrade to Pro for full tips, strategies, and mock exam coaching tailored to your score."
        >
          {guideBody}
        </PracticeResultPaywall>
      </div>
    </>
  );
}
