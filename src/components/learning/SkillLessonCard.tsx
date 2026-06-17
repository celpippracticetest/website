"use client";

import { useState } from "react";
import SvgChevronDown from "@/components/icons/ChevronDown";
import LearningCompletedState from "@/components/learning/LearningCompletedState";
import LearningSubscriptionPrompt from "@/components/learning/LearningSubscriptionPrompt";
import LessonSlideDeck from "@/components/learning/LessonSlideDeck";
import { getSkillMeta } from "@/components/learning/LearningCompletedState";
import { formatLessonLoadError } from "@/lib/learning/lessonErrors";
import { cn } from "@/lib/utils";
import type {
  DailyLessonContent,
  LearningSkill,
  SkillLessonPayload,
  SkillLessonState,
} from "@/lib/learning/types";

function lessonPreviewTitle(title?: string) {
  if (!title?.trim()) return null;
  return title.replace(/\*\*/g, "").replace(/["'""''']/g, "").trim();
}

function SkillStatusBadge({ state }: { state: SkillLessonState }) {
  if (state === "completed_today") {
    return (
      <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-success">
        Done
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-error1">
        Error
      </span>
    );
  }
  if (state === "loading") {
    return (
      <span className="rounded-full bg-[#F4F7FF] px-2 py-0.5 text-[11px] font-semibold text-primary1">
        Loading
      </span>
    );
  }
  if (state === "skipped") {
    return (
      <span className="rounded-full bg-[#F4F7FF] px-2 py-0.5 text-[11px] font-semibold text-text3">
        Skipped
      </span>
    );
  }
  if (state === "subscription_required") {
    return (
      <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-primary1">
        Pro
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[11px] font-semibold text-[#C2410C]">
      To do
    </span>
  );
}

function SkillLessonAccordion({
  skill,
  state,
  sequenceNumber,
  previewTitle,
  defaultOpen,
  children,
}: {
  skill: LearningSkill;
  state: SkillLessonState;
  sequenceNumber?: number;
  previewTitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const meta = getSkillMeta(skill);
  const [open, setOpen] = useState(defaultOpen ?? state === "active");
  const collapsedPreview = lessonPreviewTitle(previewTitle);

  return (
    <article
      className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm"
      style={{ borderTopWidth: 4, borderTopColor: meta.color }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-5 text-left screen744:p-6"
      >
        <span className="mt-0.5 shrink-0">{meta.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-text1 screen744:text-lg">
              {meta.label}
            </span>
            {sequenceNumber != null && (
              <span className="text-xs font-medium text-primary1">
                Lesson #{sequenceNumber}
              </span>
            )}
            <SkillStatusBadge state={state} />
          </span>
          {!open && collapsedPreview && (
            <span className="mt-1 block truncate text-sm text-text2">{collapsedPreview}</span>
          )}
        </span>
        <SvgChevronDown
          className={cn(
            "mt-1 shrink-0 text-text3 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="border-t border-[#E5E7EB] px-5 pb-5 pt-4 screen744:px-6 screen744:pb-6">
          {children}
        </div>
      )}
    </article>
  );
}

type Props = {
  lesson: SkillLessonPayload;
  currentClb?: number;
  targetClb?: number;
  onComplete: (skill: LearningSkill, assignmentId: string) => Promise<void>;
  completing: boolean;
};

export default function SkillLessonCard({
  lesson,
  currentClb,
  targetClb,
  onComplete,
  completing,
}: Props) {
  const meta = getSkillMeta(lesson.skill);

  if (lesson.state === "skipped") {
    return (
      <SkillLessonAccordion
        skill={lesson.skill}
        state={lesson.state}
        defaultOpen={false}
      >
        <div className="py-2 text-center">
          <p className="text-sm text-text2">
            Daily practice is off for {meta.label.toLowerCase()}.
            {currentClb != null && (
              <>
                {" "}
                Your level is recorded as{" "}
                <span className="font-semibold text-text1">CLB {currentClb}</span>.
              </>
            )}
          </p>
          <p className="mt-2 text-xs text-text3">
            Edit CLB levels above to include this skill in your daily plan.
          </p>
        </div>
      </SkillLessonAccordion>
    );
  }

  if (lesson.state === "completed_today") {
    return (
      <SkillLessonAccordion
        skill={lesson.skill}
        state={lesson.state}
        sequenceNumber={lesson.sequenceNumber}
        previewTitle={lesson.content?.title}
        defaultOpen={false}
      >
        <LearningCompletedState skill={lesson.skill} compact />
      </SkillLessonAccordion>
    );
  }

  if (lesson.state === "subscription_required") {
    return (
      <SkillLessonAccordion
        skill={lesson.skill}
        state={lesson.state}
        sequenceNumber={lesson.sequenceNumber}
        defaultOpen={false}
      >
        <LearningSubscriptionPrompt
          sequenceNumber={lesson.sequenceNumber}
          compact
        />
      </SkillLessonAccordion>
    );
  }

  if (lesson.state === "loading" || lesson.state === "error") {
    return (
      <SkillLessonAccordion
        skill={lesson.skill}
        state={lesson.state}
        sequenceNumber={lesson.sequenceNumber}
        defaultOpen
      >
        {lesson.state === "loading" ? (
          <div className="flex items-center gap-2 py-4 text-text2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary1 border-t-transparent" />
            Preparing your lesson…
          </div>
        ) : (
          <p className="py-2 text-sm text-error1">{formatLessonLoadError(lesson.error)}</p>
        )}
      </SkillLessonAccordion>
    );
  }

  const content = lesson.content as DailyLessonContent;

  return (
    <SkillLessonAccordion
      skill={lesson.skill}
      state={lesson.state}
      sequenceNumber={lesson.sequenceNumber}
      previewTitle={content.title}
      defaultOpen
    >
      <LessonSlideDeck
        content={content}
        skill={lesson.skill}
        accentColor={meta.color}
        currentClb={currentClb}
        targetClb={targetClb}
        assignmentId={lesson.assignmentId}
        completing={completing}
        onComplete={onComplete}
      />
    </SkillLessonAccordion>
  );
}
