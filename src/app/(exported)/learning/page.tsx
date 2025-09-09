import {
  LearningGuide,
  LearningListening,
  LearningMockExam,
  LearningReading,
  LearningSpeaking,
  LearningWriting,
  SvgMic,
} from "@/components/icons";
import SvgSvgBeforeTypingWord from "@/components/icons/SvgBeforeTypingWord";
import React from "react";

const Page = () => {
  const SvgAllSkills = [
    <LearningListening />,
    <LearningSpeaking />,
    <LearningWriting />,
    <LearningReading />,
    <LearningMockExam />,
    <LearningGuide />,
  ];
  return (
    <section className="relative h-[100vh] w-full transition-all duration-300 shadow-[inset_0px_-80px_96px_-4px_#F4F7FF] overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-[16px] screen744:!px-[24px] screen1280:!px-[32px] pt-[140px] pb-[140px]">
          <div className="max-w-[980px] z-[999] mx-auto text-center">
            <h1 className="text-[28px] screen744:!text-[36px] z-[999] screen1280:!text-[44px] font-bold text-[#37465C] tracking-tight mb-[6px]">
              Talk & Learn – CELPIP Style
            </h1>
            <h2 className="text-[#37465C] z-[999] text-[14px]  screen744:!text-[16px] mb-[22px]">
              Ask CELPIP‑style questions, get real‑time answers.
            </h2>
          </div>
          <div className="  w-full">
            <div className="max-w-[980px] mx-auto px-[12px] py-[12px]">
              <form className="w-full flex gap-[8px] relative">
                <textarea
                  placeholder="Write your answer or ask for help…"
                  className="flex-1 p-[24px] rounded-[16px] w-[150px] h-auto min-h-[140px] border bg-white border-[#D1D5DB] pr-[112px] pb-[64px]  text-[14px] text-[#111827] outline-none focus:border-[#6366F1] shadow-sm"
                ></textarea>

                <div className="absolute w-[88px] h-[40px] right-[18px] bottom-[18px] flex items-center gap-[12px]">
                  <button type="button">
                    <SvgMic />
                  </button>
                  <button type="submit">
                    <SvgSvgBeforeTypingWord />
                  </button>
                </div>
              </form>
            </div>

            <div className="max-w-[980px] mx-auto px-[12px] pt-[8px] flex flex-wrap gap-[8px] justify-center">
              {[
                "Listening",
                "Speaking ",
                "Writing",
                "Reading",
                "Mock Exams",
                "Guide & Tips",
              ].map((label, index) => (
                <button
                  key={label}
                  className="group gap-[8px]  hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] px-[16px] z-[9999] shadow-startButton  hover:cursor-pointer
                                 cursor-pointer bg-white rounded-[24px] flex items-center justify-center"
                >
                  <span>{SvgAllSkills[index]}</span>

                  <h2 className=" cursor-pointer flex items-center justify-center h-[40px] font-medium text-[14px] group-hover:text-white text-black ">
                    {label}
                  </h2>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Page;
