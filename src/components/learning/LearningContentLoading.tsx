"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LEARNING_SKILLS,
  skillLabel,
  skillToKey,
  type ClbScores,
} from "@/lib/learning/types";
import { getSkillMeta } from "@/components/learning/LearningCompletedState";
import { cn } from "@/lib/utils";

type Props = {
  currentClb?: ClbScores;
  targetClb?: ClbScores;
};

function buildMessages(currentClb?: ClbScores, targetClb?: ClbScores): string[] {
  const messages = [
    "We are creating learning content based on your targets…",
    "Aligning lessons to real CELPIP tasks…",
    "Building rubric comparisons for your level…",
    "Preparing vocabulary banks and exemplars…",
    "Crafting actionable drills for each skill…",
  ];

  if (targetClb) {
    for (const skill of LEARNING_SKILLS) {
      const key = skillToKey(skill);
      const current = currentClb?.[key];
      const target = targetClb[key];
      if (
        current != null &&
        target != null &&
        target === current
      ) {
        continue;
      }
      messages.push(`Tailoring ${skillLabel(skill)} toward CLB ${target}…`);
    }
  }

  messages.push("Almost ready…");
  return messages;
}

export default function LearningContentLoading({
  currentClb,
  targetClb,
}: Props) {
  const messages = useMemo(
    () => buildMessages(currentClb, targetClb),
    [currentClb, targetClb]
  );
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(8);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const progressId = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        return prev + 2 + Math.random() * 5;
      });
    }, 450);

    return () => window.clearInterval(progressId);
  }, []);

  useEffect(() => {
    const messageId = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
        setVisible(true);
      }, 220);
    }, 2800);

    return () => window.clearInterval(messageId);
  }, [messages.length]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center py-16 screen744:py-20">
      <div className="mb-8 grid w-full grid-cols-2 gap-3 screen744:grid-cols-4 screen744:gap-4">
        {LEARNING_SKILLS.map((skill, index) => {
          const meta = getSkillMeta(skill);
          const current = currentClb?.[skillToKey(skill)];
          const target = targetClb?.[skillToKey(skill)];
          const skipped =
            current != null && target != null && target === current;

          return (
            <motion.div
              key={skill}
              className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay: index * 0.35,
                ease: "easeInOut",
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: meta.color }}
              />
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F4F7FF]">
                {meta.icon}
              </div>
              <p className="text-sm font-semibold text-text1">{meta.label}</p>
              {skipped ? (
                <p className="mt-1 text-xs text-text3">Skipped</p>
              ) : current != null && target != null ? (
                <p className="mt-1 text-xs text-text3">
                  CLB {current}
                  <span className="mx-1 text-primary1">→</span>
                  CLB {target}
                </p>
              ) : (
                <div className="mt-2 h-3 w-16 animate-pulse rounded bg-[#E5E7EB]/80" />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="w-full max-w-md text-center">
        <p
          className={cn(
            "min-h-[3rem] text-base font-medium text-text1 transition-opacity duration-300 screen744:text-lg",
            visible ? "opacity-100" : "opacity-0"
          )}
        >
          {messages[messageIndex]}
        </p>
        <p className="mt-2 text-sm text-text2">
          This can take a minute the first time — your lessons are personalized.
        </p>

        <div
          className="relative mt-6 h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <motion.div
            className="h-full rounded-full bg-primary1"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
          <motion.div
            className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ["-120%", "320%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}
