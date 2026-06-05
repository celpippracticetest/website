"use client";

interface PracticeQuestionExplanationProps {
  description: string;
  variant?: "tip" | "wrong";
}

export default function PracticeQuestionExplanation({
  description,
  variant = "tip",
}: PracticeQuestionExplanationProps) {
  const isWrong = variant === "wrong";

  return (
    <div
      className={`mt-[12px] rounded-[12px] px-[16px] py-[14px] text-[14px] leading-relaxed ${
        isWrong
          ? "bg-[#FFF5EF] border border-[#FFDCC0] text-[#37465C]"
          : "bg-[#F0F6FF] border border-[#D6E6FF] text-[#37465C]"
      }`}
    >
      <div className="font-semibold text-[#212E42] mb-[6px]">
        {isWrong ? "Why this answer" : "Tip"}
      </div>
      <p className="whitespace-pre-line">{description}</p>
    </div>
  );
}
