"use client";

import React from "react";
import SvgBeavo from "../icons/Beavo";
import { useAskBeavoStore } from "@/stores/askBeavoStore";

const AskBeavoButton: React.FC = () => {
  const { isOpen, setOpen } = useAskBeavoStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <button
        onClick={() => setOpen(!isOpen)}
        className="relative flex items-center cursor-pointer justify-center text-[#212E42] text-[14px] h-[40px] w-[134px] gap-[8px] rounded-[24px] px-[16px] pl-[8px] font-normal
                bg-white overflow-hidden shadow-lg hover:scale-105 transition-transform duration-200"
      >
        <span
          className="absolute inset-0 rounded-[24px] p-[1px] bg-[length:200%_200%] animate-gradientBorder 
                     bg-gradient-to-r from-[#F79D65] via-[#759CFF] to-[#F79D65]"
        >
          <span className="block w-full h-full rounded-[24px] bg-white"></span>
        </span>

        <div className="relative text-lg z-50">
          <SvgBeavo />
        </div>
        <span className="relative flex">Ask Beavo</span>
      </button>
    </div>
  );
};

export default AskBeavoButton;


export default AskBeavoButton;
