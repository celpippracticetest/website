"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/v2/Button";
import FormattedLessonText, {
  LessonInlineText,
} from "@/components/learning/FormattedLessonText";
import { cn } from "@/lib/utils";
import type { DailyLessonContent, LearningSkill } from "@/lib/learning/types";

function ClbLevelLabel({
  clb,
  variant,
  className,
}: {
  clb?: number;
  variant: "current" | "target";
  className?: string;
}) {
  const isCurrent = variant === "current";
  return (
    <span
      className={cn(
        "inline-flex min-w-[3.25rem] items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ring-1",
        isCurrent
          ? "bg-[#FEF2F2] text-[#B91C1C] ring-[#FECACA]"
          : "bg-[#ECFDF5] text-success ring-[#A7F3D0]",
        className
      )}
    >
      {clb != null ? `CLB ${clb}` : "CLB —"}
    </span>
  );
}

function RubricBlock({
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
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-4">
      <h5 className="mb-3 text-sm font-semibold text-text1">{title}</h5>
      <div className="space-y-3 text-xs screen744:text-sm">
        <div>
          <ClbLevelLabel clb={currentClb} variant="current" className="mb-2" />
          <FormattedLessonText text={current} variant="prose" skill={skill} />
        </div>
        <div>
          <ClbLevelLabel clb={targetClb} variant="target" className="mb-2" />
          <FormattedLessonText text={target} variant="prose" skill={skill} />
        </div>
      </div>
    </div>
  );
}

type Slide = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type Props = {
  content: DailyLessonContent;
  skill: LearningSkill;
  accentColor: string;
  currentClb?: number;
  targetClb?: number;
  assignmentId?: string;
  completing: boolean;
  onComplete: (skill: LearningSkill, assignmentId: string) => Promise<void>;
};

function SlideBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-h-[min(58vh,560px)] overflow-y-auto pr-1 screen744:max-h-[min(62vh,620px)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export default function LessonSlideDeck({
  content,
  skill,
  accentColor,
  currentClb,
  targetClb,
  assignmentId,
  completing,
  onComplete,
}: Props) {
  const slides = useMemo<Slide[]>(() => {
    const built: Slide[] = [
      {
        id: "overview",
        label: "Intro",
        content: (
          <SlideBody>
            <h3 className="text-lg font-bold text-text1 screen744:text-xl">
              <LessonInlineText text={content.title} skill={skill} />
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#F4F7FF] px-3 py-1 text-xs font-medium text-primary1">
                <LessonInlineText text={content.focusArea} skill={skill} />
              </span>
              <span className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-medium text-[#C2410C]">
                <LessonInlineText text={content.linguisticKey} skill={skill} />
              </span>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-text2">
              Work through each slide at your own pace. Use the rubric, vocabulary,
              and drills to apply what you learn before marking the lesson complete.
            </p>
          </SlideBody>
        ),
      },
      {
        id: "core",
        label: "Lesson",
        content: (
          <SlideBody>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-primary1">
              Core lesson
            </h4>
            <FormattedLessonText
              text={content.coreLesson}
              variant="prose"
              skill={skill}
            />
          </SlideBody>
        ),
      },
      {
        id: "template",
        label: "Template",
        content: (
          <SlideBody>
            <div className="rounded-xl border border-[#D6E4FF] bg-[#F4F7FF] p-4 screen744:p-5">
              <h4 className="mb-3 text-sm font-bold text-primary1">
                Mental template
              </h4>
              <FormattedLessonText
                text={content.mentalTemplate}
                variant="template"
                skill={skill}
              />
            </div>
          </SlideBody>
        ),
      },
      {
        id: "rubric",
        label: "Rubric",
        content: (
          <SlideBody>
            <h4 className="mb-3 text-sm font-semibold text-text1">
              Rubric comparison
            </h4>
            <div className="space-y-3">
              <RubricBlock
                title="Content & coherence"
                current={content.rubricComparison.contentCoherence.clbCurrentHabits}
                target={content.rubricComparison.contentCoherence.clbTargetUpgrades}
                skill={skill}
                currentClb={currentClb}
                targetClb={targetClb}
              />
              <RubricBlock
                title="Vocabulary"
                current={content.rubricComparison.vocabulary.clbCurrentHabits}
                target={content.rubricComparison.vocabulary.clbTargetUpgrades}
                skill={skill}
                currentClb={currentClb}
                targetClb={targetClb}
              />
              <RubricBlock
                title="Grammar & clarity"
                current={
                  content.rubricComparison.listenabilityReadability.clbCurrentHabits
                }
                target={
                  content.rubricComparison.listenabilityReadability.clbTargetUpgrades
                }
                skill={skill}
                currentClb={currentClb}
                targetClb={targetClb}
              />
              <RubricBlock
                title="Task fulfillment"
                current={content.rubricComparison.taskFulfillment.clbCurrentHabits}
                target={content.rubricComparison.taskFulfillment.clbTargetUpgrades}
                skill={skill}
                currentClb={currentClb}
                targetClb={targetClb}
              />
            </div>
          </SlideBody>
        ),
      },
    ];

    if (content.vocabularyBank.length > 0) {
      built.push({
        id: "vocabulary",
        label: "Words",
        content: (
          <SlideBody>
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
                    skill={skill}
                    className="font-semibold text-text1"
                  />
                  <span className="text-text2">
                    {" "}
                    —{" "}
                    <LessonInlineText text={item.definition} skill={skill} />
                  </span>
                  <p className="mt-1 text-xs text-text3">
                    <LessonInlineText text={item.usage} skill={skill} />
                  </p>
                </li>
              ))}
            </ul>
          </SlideBody>
        ),
      });
    }

    built.push({
      id: "exemplar",
      label: "Examples",
      content: (
        <SlideBody>
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
                  skill={skill}
                />
              </div>
            </div>
            <div>
              <ClbLevelLabel clb={targetClb} variant="target" className="mb-2" />
              <div className="rounded-lg bg-[#ECFDF5] p-3 text-text2 screen744:p-4">
                <FormattedLessonText
                  text={content.exemplarAnalysis.clbTargetExample}
                  variant="prose"
                  skill={skill}
                />
              </div>
            </div>
            <FormattedLessonText
              text={content.exemplarAnalysis.linguisticUpgrades}
              variant="prose"
              skill={skill}
            />
          </div>
        </SlideBody>
      ),
    });

    content.actionableDrills.forEach((drill, index) => {
      built.push({
        id: `drill-${index}`,
        label: `Drill ${index + 1}`,
        content: (
          <SlideBody>
            <section
              className="rounded-xl border-2 border-dashed p-4"
              style={{ borderColor: accentColor }}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">
                Drill {index + 1} of {content.actionableDrills.length}
              </p>
              <h4 className="mb-2 font-semibold text-text1">
                <LessonInlineText text={drill.drillTitle} skill={skill} />
              </h4>
              <FormattedLessonText
                text={drill.instructions}
                variant="drill"
                skill={skill}
              />
              <div className="mt-3 rounded-lg bg-[#FFFBEB] p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-[#92400E]">
                  Self-check
                </p>
                <FormattedLessonText
                  text={drill.selfAssessmentChecklist}
                  variant="checklist"
                  skill={skill}
                />
              </div>
            </section>
          </SlideBody>
        ),
      });
    });

    built.push({
      id: "finish",
      label: "Done",
      content: (
        <SlideBody className="max-h-none overflow-visible">
          <div className="rounded-xl border border-[#D6E4FF] bg-[#F4F7FF] p-5 text-center">
            <p className="text-sm font-medium text-primary1">You&apos;re all caught up</p>
            <h4 className="mt-2 text-lg font-bold text-text1">
              Ready to mark this lesson complete?
            </h4>
            <p className="mt-2 text-sm text-text2">
              Finish when you&apos;ve reviewed the lesson and tried the drills.
            </p>
          </div>
        </SlideBody>
      ),
    });

    return built;
  }, [accentColor, content, currentClb, skill, targetClb]);

  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    setSlideIndex(0);
  }, [content.title, assignmentId]);

  const activeSlide = slides[slideIndex];
  const isFirstSlide = slideIndex === 0;
  const isLastSlide = slideIndex === slides.length - 1;

  const goBack = () => {
    setSlideIndex((prev) => Math.max(0, prev - 1));
  };

  const goNext = () => {
    setSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary1">
          Slide {slideIndex + 1} of {slides.length}
        </p>
        <p className="truncate text-sm text-text2">{activeSlide.label}</p>
      </div>

      <div
        className="mb-4 flex gap-1.5 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Lesson slides"
      >
        {slides.map((slide, index) => {
          const isCurrent = index === slideIndex;
          const isPast = index < slideIndex;

          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setSlideIndex(index)}
              className={cn(
                "h-2 shrink-0 rounded-full transition-all duration-300",
                isCurrent ? "w-8 bg-primary1" : "w-2",
                !isCurrent && isPast && "bg-primary1/50",
                !isCurrent && !isPast && "bg-outline/80"
              )}
              aria-label={`${slide.label}${isCurrent ? ", current slide" : ""}`}
              aria-current={isCurrent ? "step" : undefined}
            />
          );
        })}
      </div>

      <div
        key={activeSlide.id}
        className="animate-in fade-in slide-in-from-right-4 duration-300"
      >
        {activeSlide.content}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 screen744:flex-row screen744:items-center screen744:justify-between">
        <div className="flex flex-1 flex-col-reverse gap-3 screen744:flex-row screen744:justify-end">
          {!isFirstSlide && (
            <Button
              variant="secondary"
              size="md"
              onClick={goBack}
              className="min-w-[120px]"
            >
              Back
            </Button>
          )}
          {!isLastSlide && (
            <Button
              variant="primary"
              size="md"
              onClick={goNext}
              className="min-w-[140px]"
            >
              Next
            </Button>
          )}
        </div>

        {isLastSlide && assignmentId && (
          <Button
            variant="primary"
            size="md"
            disabled={completing}
            onClick={() => void onComplete(skill, assignmentId)}
            className="min-w-[180px] screen744:ml-auto"
          >
            {completing ? "Saving…" : "Mark complete"}
          </Button>
        )}
      </div>
    </div>
  );
}
