"use client";

interface GrammarMistake {
  original: string;
  improvement: string | null;
}

interface PracticeGrammarMistakesProps {
  mistakes: GrammarMistake[];
}

export default function PracticeGrammarMistakes({
  mistakes,
}: PracticeGrammarMistakesProps) {
  if (!mistakes?.length) return null;

  return (
    <div className="flex flex-col gap-3 mb-10 pt-4 scroll-mt-24">
      <h4 className="font-bold text-[22px] text-[#EE4266] leading-tight">
        Grammar &amp; Wording Fixes
      </h4>
      <div className="prose prose-base max-w-none text-slate-800 bg-[#FFF5EF] p-6 rounded-[12px] leading-8 text-[16px]">
        {mistakes.map((block, index) => {
          if (block.improvement == null) {
            return (
              <span key={index} className="text-slate-700">
                {block.original}{" "}
              </span>
            );
          }
          return (
            <span key={index}>
              <span className="bg-[#FFBDB3] text-slate-900 mx-0.5 px-0.5 rounded-[2px] line-through decoration-slate-500/50">
                {block.original}
              </span>
              <span className="bg-[#B3FFBD] text-slate-900 mx-0.5 px-0.5 rounded-[2px] font-normal">
                {block.improvement}
              </span>{" "}
            </span>
          );
        })}
      </div>
    </div>
  );
}
