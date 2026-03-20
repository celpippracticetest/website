"use client";

import SvgListeningPart from "@/components/icons/ListeningPart";
import SvgReadingPart from "@/components/icons/ReadingPart";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
import SvgWritingPart from "@/components/icons/WritingPart";
import { PRACTICE_PARTS } from "@/constants";
import React from "react";

export interface PracticeSectionItem {
  title: string;
  route: string;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
}

const sectionRanges: Record<string, { start: number; end: number }> = {
  listening: { start: 0, end: 6 },
  reading: { start: 6, end: 10 },
  writing: { start: 10, end: 12 },
  speaking: { start: 12, end: 20 },
};

export const createMockPracticeSections = (): PracticeSectionItem[] => [
  {
    title: "Listening",
    color: "text-[#316BFF]",
    icon: <SvgListeningPart />,
    bgColor: "bg-[#D1DEFF]",
    route: "listening",
  },
  {
    title: "Reading",
    color: "text-[#F27059]",
    bgColor: "bg-[#FFE2E8]",
    icon: <SvgReadingPart />,
    route: "reading",
  },
  {
    title: "Writing",
    color: "text-[#0DAA94]",
    icon: <SvgWritingPart />,
    bgColor: "bg-[#F0FFFD]",
    route: "writing",
  },
  {
    title: "Speaking",
    color: "text-[#EE4266]",
    icon: <SvgSpeakingPart />,
    bgColor: "bg-[#FFEBD6]",
    route: "speaking",
  },
];

export const getMockExamPartsForSection = (route: string) => {
  const range = sectionRanges[route];

  if (!range) {
    return [] as { title: string; index: number }[];
  }

  const slice = PRACTICE_PARTS.slice(range.start, range.end);

  return slice.map((title, index) => ({
    title,
    index: range.start + index + 1,
  }));
};
