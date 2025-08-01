import {
  Coherence,
  Fullfilment,
  Readability,
  Score,
  Vocabulary,
} from "@/components/icons";
import React from "react";

const MockTest = () => {
  return (
    <>
      <h1 className="sr-only">Mock CELPIP Tests with AI Scoring</h1>
      <div className="text-text3  pt-[16px]  rounded-[8px] border-[1px] border-[#D5D6D8] min-h-[255px]">
        <div className="flex gap-[27px]">
          <div className="pl-[16px] ">
            <Score />
          </div>
          <div className="flex flex-col  screen744:!gap-[16px]">
            <span className="text-[16px] screen744:!text-[20px] leading-[16px] screen1280:!leading-[28px] font-bold text-text1">
              Excellent and clear
            </span>
            <span className="text-[10px] pr-[16px] screen744:!text-[12px] leading-[16px] screen1280:!leading-[24px] font-normal text-text1">
              The response addresses all requirements with clear organization,
              varied vocabulary, and proper language use.{" "}
            </span>
          </div>
        </div>
        <div className="h-[141px] flex  border-t border-[#D5D6D8]">
          <div className="flex flex-1 items-center justify-center border-r border-[#D5D6D8]">
            <Coherence />
          </div>
          <div className="flex flex-1 items-center justify-center border-r border-[#D5D6D8]">
            <Vocabulary />
          </div>
          <div className="flex  flex-1 items-center justify-center border-r border-[#D5D6D8]">
            <Readability />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <Fullfilment />
          </div>
        </div>
      </div>
    </>
  );
};

export default MockTest;
