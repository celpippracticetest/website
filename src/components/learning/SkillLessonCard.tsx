"use client";

import { useState } from "react";
import { Button } from "@/components/v2/Button";
import SvgChevronDown from "@/components/icons/ChevronDown";
import LearningCompletedState from "@/components/learning/LearningCompletedState";
import LearningSubscriptionPrompt from "@/components/learning/LearningSubscriptionPrompt";
import { getSkillMeta } from "@/components/learning/LearningCompletedState";
import FormattedLessonText, {
  LessonInlineText,
} from "@/components/learning/FormattedLessonText";
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

function ClbLevelLabel({
  clb,
  variant,
  showCaption = true,
  className,
}: {
  clb?: number;
  variant: "current" | "target";
  showCaption?: boolean;
  className?: string;
}) {
  const isCurrent = variant === "current";
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span
        className={
          isCurrent
            ? "inline-flex min-w-[3.25rem] items-center justify-center rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-xs font-bold tracking-wide text-[#B91C1C] ring-1 ring-[#FECACA]"
            : "inline-flex min-w-[3.25rem] items-center justify-center rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-bold tracking-wide text-success ring-1 ring-[#A7F3D0]"
        }
      >
        {clb != null ? `CLB ${clb}` : "CLB —"}
      </span>
      {showCaption && (
        <span
          className={
            isCurrent
              ? "text-sm font-medium text-text2"
              : "text-sm font-medium text-success"
          }
        >
          {isCurrent ? "Where you are now" : "What you're aiming for"}
        </span>
      )}
    </div>
  );
}

function RubricSection({
  title,
  current,
  target,
  skill,
  currentClb,
  targetClb,
}: {
  title: string;
  current: string;
  target: string;
  skill: LearningSkill;
  currentClb?: number;
  targetClb?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text1"
      >
        {title}
        <span className="text-text3">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-[#E5E7EB] px-4 py-3 text-xs screen744:text-sm">
          <div>
            <ClbLevelLabel
              clb={currentClb}
              variant="current"
              showCaption={false}
              className="mb-2"
            />
            <FormattedLessonText text={current} variant="prose" skill={skill} />
          </div>
          <div>
            <ClbLevelLabel
              clb={targetClb}
              variant="target"
              showCaption={false}
              className="mb-2"
            />
            <FormattedLessonText text={target} variant="prose" skill={skill} />
          </div>
        </div>
      )}
    </div>
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
        <h3 className="text-lg font-bold text-text1 screen744:text-xl">
          <LessonInlineText text={content.title} skill={lesson.skill} />
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#F4F7FF] px-3 py-1 text-xs font-medium text-primary1">
            <LessonInlineText text={content.focusArea} skill={lesson.skill} />
          </span>
          <span className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-medium text-[#C2410C]">
            <LessonInlineText text={content.linguisticKey} skill={lesson.skill} />
          </span>
        </div>

        <section className="mt-5">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-primary1">
            Core lesson
          </h4>
          <FormattedLessonText
            text={content.coreLesson}
            variant="prose"
            skill={lesson.skill}
          />
        </section>

        <section className="mt-5 rounded-xl border border-[#D6E4FF] bg-[#F4F7FF] p-4 screen744:p-5">
          <h4 className="mb-3 text-sm font-bold text-primary1">
            Mental template
          </h4>
          <FormattedLessonText
            text={content.mentalTemplate}
            variant="template"
            skill={lesson.skill}
          />
        </section>

        <section className="mt-5">
          <h4 className="mb-3 text-sm font-semibold text-text1">
            Rubric comparison
          </h4>
          <div className="space-y-2">
            <RubricSection
              title="Content & coherence"
              current={content.rubricComparison.contentCoherence.clbCurrentHabits}
              target={content.rubricComparison.contentCoherence.clbTargetUpgrades}
              skill={lesson.skill}
              currentClb={currentClb}
              targetClb={targetClb}
            />
            <RubricSection
              title="Vocabulary"
              current={content.rubricComparison.vocabulary.clbCurrentHabits}
              target={content.rubricComparison.vocabulary.clbTargetUpgrades}
              skill={lesson.skill}
              currentClb={currentClb}
              targetClb={targetClb}
            />
            <RubricSection
              title="Grammar & clarity"
              current={
                content.rubricComparison.listenabilityReadability.clbCurrentHabits
              }
              target={
                content.rubricComparison.listenabilityReadability.clbTargetUpgrades
              }
              skill={lesson.skill}
              currentClb={currentClb}
              targetClb={targetClb}
            />
            <RubricSection
              title="Task fulfillment"
              current={content.rubricComparison.taskFulfillment.clbCurrentHabits}
              target={content.rubricComparison.taskFulfillment.clbTargetUpgrades}
              skill={lesson.skill}
              currentClb={currentClb}
              targetClb={targetClb}
            />
          </div>
        </section>

        {content.vocabularyBank.length > 0 && (
          <section className="mt-5">
            <h4 className="mb-3 text-sm font-semibold text-text1">
              Vocabulary bank
            </h4>
            <ul className="space-y-2">
              {content.vocabularyBank.map((item) => (
                <li
                  key={item.term}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                >
                  <LessonInlineText
                    text={item.term}
                    skill={lesson.skill}
                    className="font-semibold text-text1"
                  />
                  <span className="text-text2">
                    {" "}
                    —{" "}
                    <LessonInlineText text={item.definition} skill={lesson.skill} />
                  </span>
                  <p className="mt-1 text-xs text-text3">
                    <LessonInlineText text={item.usage} skill={lesson.skill} />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5 rounded-xl border border-[#E5E7EB] p-4">
          <h4 className="mb-3 text-sm font-semibold text-text1">
            Exemplar analysis
          </h4>
          <div className="space-y-4 text-sm">
            <div>
              <ClbLevelLabel clb={currentClb} variant="current" className="mb-2" />
              <div className="rounded-lg bg-[#FEF2F2] p-3 text-text2 screen744:p-4">
                <FormattedLessonText
                  text={content.exemplarAnalysis.clbCurrentExample}
                  variant="prose"
                  skill={lesson.skill}
                />
              </div>
            </div>
            <div>
              <ClbLevelLabel clb={targetClb} variant="target" className="mb-2" />
              <div className="rounded-lg bg-[#ECFDF5] p-3 text-text2 screen744:p-4">
                <FormattedLessonText
                  text={content.exemplarAnalysis.clbTargetExample}
                  variant="prose"
                  skill={lesson.skill}
                />
              </div>
            </div>
            <FormattedLessonText
              text={content.exemplarAnalysis.linguisticUpgrades}
              variant="prose"
              skill={lesson.skill}
            />
          </div>
        </section>

        {content.actionableDrills.map((drill) => (
          <section
            key={drill.drillTitle}
            className="mt-5 rounded-xl border-2 border-dashed p-4"
            style={{ borderColor: meta.color }}
          >
            <h4 className="mb-1 font-semibold text-text1">
              <LessonInlineText text={drill.drillTitle} skill={lesson.skill} />
            </h4>
            <FormattedLessonText
              text={drill.instructions}
              variant="drill"
              skill={lesson.skill}
            />
            <div className="mt-3 rounded-lg bg-[#FFFBEB] p-3">
              <p className="mb-1 text-xs font-semibold uppercase text-[#92400E]">
                Self-check
              </p>
              <FormattedLessonText
                text={drill.selfAssessmentChecklist}
                variant="checklist"
                skill={lesson.skill}
              />
            </div>
          </section>
        ))}

        {lesson.assignmentId && (
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              size="md"
              disabled={completing}
              onClick={() =>
                void onComplete(lesson.skill, lesson.assignmentId!)
              }
              className="min-w-[180px]"
            >
              {completing ? "Saving…" : "Mark complete"}
            </Button>
          </div>
        )}
    </SkillLessonAccordion>
  );
}
