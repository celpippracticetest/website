"use client";

import {
  getProductionScoreHeadline,
  getWeakestProductionSkills,
} from "@/lib/practiceResultGuide";

interface PracticeProductionScoreGuideProps {
  skill: "Writing" | "Speaking";
  scores: {
    coherence: number;
    vocabulary: number;
    readability: number;
    fulfillment: number;
  };
  overall: number;
}

export default function PracticeProductionScoreGuide({
  skill,
  scores,
  overall,
}: PracticeProductionScoreGuideProps) {
  const headline = getProductionScoreHeadline(overall);
  const priorities = getWeakestProductionSkills(scores);

  return (
    <div className="mt-4 border border-[#D5D6D8] rounded-[12px] bg-white overflow-hidden">
      <div className="px-[16px] py-[14px] bg-[#F4F7FF] border-b border-[#D5D6D8]">
        <div className="text-[#212E42] font-semibold text-[16px]">
          {skill} score guide
        </div>
        <div className="text-[#76808F] mt-[4px] text-[14px]">{headline.title}</div>
      </div>
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
      </div>
    </div>
  );
}
