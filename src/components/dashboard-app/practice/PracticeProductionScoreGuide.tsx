"use client";

import {
  getProductionScoreHeadline,
  getMockExamProductionTips,
  getWeakestProductionSkills,
} from "@/lib/practiceResultGuide";
import PracticeResultPaywall from "./PracticeResultPaywall";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { usePricingNavModal } from "@/hooks/usePricingNavModal";
import { PricingNavModal } from "@/components/pages/pricing/PricingNavModal";

interface PracticeProductionScoreGuideProps {
  skill: "Writing" | "Speaking";
  scores: {
    coherence: number;
    vocabulary: number;
    readability: number;
    fulfillment: number;
  };
  overall: number;
  context?: "practice" | "mock";
}

export default function PracticeProductionScoreGuide({
  skill,
  scores,
  overall,
  context = "practice",
}: PracticeProductionScoreGuideProps) {
  const { user, isLoaded } = useHybridWebUser();
  const { open: pricingModalOpen, setOpen: setPricingModalOpen, openPricingModal } =
    usePricingNavModal();
  const isPro = hasPaidPracticeAccess(
    user?.publicMetadata?.plan as string | undefined,
    user?.publicMetadata?.purchaseDate as string | undefined
  );
  const lockGuide = context === "mock" && (isLoaded ? !isPro : true);

  const headline = getProductionScoreHeadline(overall);
  const priorities = getWeakestProductionSkills(scores);
  const mockTips = context === "mock" ? getMockExamProductionTips(skill) : [];

  const guideBody = (
    <div className="px-[16px] py-[14px] flex flex-col gap-[12px]">
      <p className="text-[14px] text-[#37465C] leading-relaxed">
        {headline.description}
      </p>
      <div>
        <div className="text-[13px] font-semibold text-[#212E42] mb-[8px] uppercase tracking-wide">
          Priority fixes
        </div>
        <ul className="flex flex-col gap-[10px]">
          {priorities.map((item) => (
            <li
              key={item.skill}
              className="text-[14px] text-[#37465C] leading-relaxed pl-[12px] border-l-2 border-[#316BFF]"
            >
              <span className="font-semibold text-[#212E42]">
                {item.skill} ({item.score}/12):
              </span>{" "}
              {item.tip}
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
    </div>
  );

  return (
    <>
      <PricingNavModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
      <div className="mt-4 border border-[#D5D6D8] rounded-[12px] bg-white overflow-hidden">
        <div className="px-[16px] py-[14px] bg-[#F4F7FF] border-b border-[#D5D6D8]">
          <div className="text-[#212E42] font-semibold text-[16px]">
            {skill} score guide
          </div>
          <div className="text-[#76808F] mt-[4px] text-[14px]">{headline.title}</div>
        </div>
        <PracticeResultPaywall
          locked={lockGuide}
          onUpgrade={openPricingModal}
          tint="#ffffff"
          title="You're seeing half of your result guide"
          description="Upgrade to Pro for full priority fixes and mock exam coaching for Writing and Speaking."
        >
          {guideBody}
        </PracticeResultPaywall>
      </div>
    </>
  );
}
