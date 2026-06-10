"use client";

import {
  LearningListening,
  LearningReading,
  LearningSpeaking,
  LearningWriting,
} from "@/components/icons";
import type { LearningSkill } from "@/lib/learning/types";

const SKILL_META: Record<
  LearningSkill,
  { label: string; color: string; icon: React.ReactNode }
> = {
  LISTENING: {
    label: "Listening",
    color: "#316BFF",
    icon: <LearningListening className="text-[#316BFF]" />,
  },
  READING: {
    label: "Reading",
    color: "#EE4266",
    icon: <LearningReading className="text-[#EE4266]" />,
  },
  WRITING: {
    label: "Writing",
    color: "#0DAA94",
    icon: <LearningWriting className="text-[#0DAA94]" />,
  },
  SPEAKING: {
    label: "Speaking",
    color: "#F4845F",
    icon: <LearningSpeaking className="text-[#F4845F]" />,
  },
};

export function getSkillMeta(skill: LearningSkill) {
  return SKILL_META[skill];
}

export default function LearningCompletedState({
  skill,
  compact = false,
}: {
  skill: LearningSkill;
  compact?: boolean;
}) {
  const meta = SKILL_META[skill];
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center px-2 py-6 text-center"
          : "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-6 py-10 text-center"
      }
    >
      {!compact && <span className="mb-3">{meta.icon}</span>}
      <p className="text-lg font-semibold text-text1">{meta.label} — done!</p>
      <p className="mt-2 max-w-sm text-sm text-text2">
        You completed today&apos;s lesson. Come back tomorrow for your next
        module.
      </p>
    </div>
  );
}
