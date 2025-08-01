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
      <div className="text-text3  pt-[8px]  rounded-[8px] border-[1px] border-[#D5D6D8] min-h-[232px]">
        <div className="flex gap-[10px]">
          <div className="pl-[8px] ">
            <Score />
          </div>
          <div className="flex flex-col  sm:!gap-[16px]">
            <span className="text-[16px]  font-bold text-text1">
              Excellent and clear
            </span>
            <span className="text-[10px]  font-normal text-text1">
              The response addresses all requirements with clear organization,
              varied vocabulary, and proper language use.{" "}
            </span>
          </div>
        </div>
        <div className="h-[125px] flex  border-t border-[#D5D6D8]">
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
