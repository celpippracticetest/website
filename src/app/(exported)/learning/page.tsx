"use client";

import React, { useEffect, useRef, useState } from "react";
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
import SvgLearningArrowUp from "@/components/icons/LearningArrowUp";

type Skill = {
  label: string;
  icon: React.ReactNode;
  description?: string[];
  popoverLabel?: string;
};

type PopPos = { top: number; left: number };

const Page = () => {
  const skills: Skill[] = [
    {
      label: "Speaking",
      popoverLabel: " Analyze my recent speaking results",
      icon: (
        <LearningSpeaking className="text-[#F4845F] group-hover:!text-white" />
      ),
      description: [
        "Can you evaluate my speaking and give me feedback?",
        "How can I improve my pronunciation and fluency?",
        "Can we practice a speaking test together?",
        "What are some common speaking mistakes made by learners?",
      ],
    },
    {
      label: "Writing",
      icon: (
        <LearningWriting className="text-[#0DAA94] group-hover:!text-white" />
      ),
    },
    {
      label: "Reading",
      icon: (
        <LearningReading className="text-[#EE4266] group-hover:!text-white" />
      ),
    },
    {
      label: "Listening",
      icon: (
        <LearningListening className="text-[#316BFF] group-hover:!text-white" />
      ),
    },
    {
      label: "Mock Exams",
      icon: (
        <LearningMockExam className="text-[#DA2AFE] group-hover:!text-white" />
      ),
    },
    {
      label: "Guide & Tips",
      icon: (
        <LearningGuide className="text-[#759CFF] group-hover:!text-white" />
      ),
    },
  ];

  const btnRefs = useRef<HTMLButtonElement[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pos, setPos] = useState<PopPos | null>(null);

  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openPopover = (index: number) => {
    const btn = btnRefs.current[index];
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const GAP = 8;
    const PANEL_W = 320;
    const vw = window.innerWidth;

    const left = Math.max(8, Math.min(rect.left, vw - PANEL_W - 8));
    const top = rect.bottom + GAP;

    setPos({ top, left });
    setOpenIndex(index);
  };

  const popoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      const target = e.target as Node;
      const clickedButton = btnRefs.current.some(
        (b) => b && b.contains(target)
      );
      if (!clickedButton && !popoverRef.current.contains(target)) {
        setOpenIndex(null);
      }
    };
    if (openIndex !== null) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openIndex]);

  const handleDescriptionClick = (value: string) => {
    setText(value);
    setOpenIndex(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  return (
    <section className="relative w-full transition-all duration-300 overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-[16px] screen744:!px-[24px] screen1280:!px-[32px] pt-[76px] pb-[10px]">
          <div className="max-w-[980px] z-[1] mx-auto text-center">
            <h1 className="text-[28px] screen744:!text-[36px] screen1280:!text-[44px] font-bold text-[#37465C] tracking-tight mb-[6px]">
              Talk & Learn – CELPIP Style
            </h1>
            <h2 className="text-[#37465C] text-[14px] screen744:!text-[16px] mb-[22px]">
              Ask CELPIP-style questions, get real-time answers.
            </h2>
          </div>

          <div className="w-full max-w-[900px] mx-auto">
            <div className="max-w-[980px] mx-auto py-[12px]">
              <form
                className="w-full flex gap-[8px] relative"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write your answer or ask for help…"
                  className="flex-1 p-[24px] rounded-[16px] min-h-[76px] border bg-white border-[#D1D5DB] pr-[112px] pb-[64px] text-[14px] text-[#111827] outline-none focus:border-[#6366F1] shadow-sm"
                />
                <div className="absolute w-[88px] h-[40px] right-[18px] bottom-[18px] flex items-center gap-[12px]">
                  <button
                    type="button"
                    className="cursor-pointer"
                    aria-label="Record with microphone"
                  >
                    <SvgMic />
                  </button>

                  {text.trim().length === 0 ? (
                    <button
                      type="submit"
                      aria-label="Send"
                      className="cursor-pointer"
                    >
                      <SvgSvgBeforeTypingWord />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      aria-label="Send"
                      className="w-[40px] flex items-center justify-center h-[40px] cursor-pointer rounded-full bg-[#6366F1] hover:!bg-[#4F46E5] transition-colors"
                    >
                      <SvgLearningArrowUp />
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className=" mx-auto  pt-[8px] flex flex-wrap gap-[12px] justify-between">
              {skills.map((s, index) => (
                <button
                  key={s.label}
                  type="button"
                  ref={(el) => {
                    if (el) btnRefs.current[index] = el;
                  }}
                  onClick={() => openPopover(index)}
                  className={`
                    cursor-pointer 
                    group relative gap-[8px]
                    px-[16px] h-[40px]
                    bg-white rounded-[20px]
                    flex items-center justify-center
                    shadow-startButton
                    hover:bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]
                    hover:text-white
                    transition-colors
                  `}
                >
                  <span>{s.icon}</span>
                  <span className="font-medium leading-[24px] text-[16px] text-[#37465C] group-hover:text-white">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {openIndex !== null && pos && skills[openIndex]?.description && (
        <div
          ref={popoverRef}
          style={{ top: pos.top, left: pos.left, position: "fixed" as const }}
          className="z-[1000] h-[268px] max-w-[412px]"
          role="dialog"
          aria-label={`${skills[openIndex].label} options`}
        >
          <div className="bg-white rounded-[16px] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[12px] font-medium text-[#111827]">
                {skills[openIndex].popoverLabel}
              </h3>
            </div>

            <div className="mt-[20px]">
              {skills[openIndex]?.description?.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDescriptionClick(d)}
                  className="mb-[12px] cursor-pointer  font-medium text-left text-[12px] screen744:!text-[14px] text-[#316BFF] bg-[#F2F6FF]   rounded-[24px] p-[10px] transition-colors"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Page;
