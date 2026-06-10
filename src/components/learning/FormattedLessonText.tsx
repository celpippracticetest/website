"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LearningSkill } from "@/lib/learning/types";
import { skillToKey } from "@/lib/learning/types";

type Variant = "prose" | "compact" | "drill" | "checklist" | "template";

export const LESSON_BOLD_CLASS = "font-semibold text-text1";

const SITE_DOMAIN =
  /(?:on\s+)?(?:CelpipPracticeTest\.com|celpippracticetest\.com)/gi;

const INLINE_STYLE_PATTERN =
  /(\*\*[^*]+\*\*|"[^"\n]+"|\u201C[^\u201D\n]+\u201D|'[^'\n]+'|\u2018[^\u2019\n]+\u2019)/g;

function isDoubleQuoted(segment: string) {
  return (
    (segment.startsWith('"') && segment.endsWith('"')) ||
    (segment.startsWith("\u201C") && segment.endsWith("\u201D"))
  );
}

function isSingleQuoted(segment: string) {
  return (
    (segment.startsWith("'") && segment.endsWith("'")) ||
    (segment.startsWith("\u2018") && segment.endsWith("\u2019"))
  );
}

function parseStyledInline(
  text: string,
  boldClass: string,
  keyId: string | number = 0
): ReactNode[] {
  const segments = text.split(INLINE_STYLE_PATTERN);

  return segments
    .map((segment, index) => {
      if (!segment) return null;

      const key = `${keyId}-${index}`;

      if (/^\*\*.+\*\*$/.test(segment)) {
        return (
          <strong key={key} className={boldClass}>
            {segment.slice(2, -2)}
          </strong>
        );
      }

      if (isDoubleQuoted(segment)) {
        return (
          <strong key={key} className={boldClass}>
            {segment.slice(1, -1)}
          </strong>
        );
      }

      if (isSingleQuoted(segment)) {
        return (
          <em key={key} className="italic text-text1">
            {segment.slice(1, -1)}
          </em>
        );
      }

      return segment;
    })
    .filter(Boolean) as ReactNode[];
}

function parseInlineContent(
  text: string,
  boldClass: string,
  skill?: LearningSkill
): ReactNode[] {
  if (!skill || !SITE_DOMAIN.test(text)) {
    SITE_DOMAIN.lastIndex = 0;
    return parseStyledInline(text, boldClass);
  }

  SITE_DOMAIN.lastIndex = 0;
  const href = `/${skillToKey(skill)}`;
  const skillWord = skillToKey(skill);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let linkKey = 0;
  let styledPartId = 0;
  let match: RegExpExecArray | null;

  while ((match = SITE_DOMAIN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        ...parseStyledInline(
          text.slice(lastIndex, match.index),
          boldClass,
          styledPartId++
        )
      );
    }

    const hadOn = /^on\s+/i.test(match[0]);
    nodes.push(
      <Fragment key={`site-link-${linkKey++}`}>
        {hadOn ? "on our " : "our "}
        <Link
          href={href}
          className="font-semibold text-primary1 underline decoration-primary1/40 underline-offset-2 hover:decoration-primary1"
        >
          {skillWord}
        </Link>
        {" practice"}
      </Fragment>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      ...parseStyledInline(text.slice(lastIndex), boldClass, styledPartId++)
    );
  }

  return nodes;
}

function isChecklistLine(line: string) {
  const t = line.trim();
  return (
    /^[✓✔☑]\s+/.test(t) ||
    /^\[[xX ]?\]\s+/.test(t) ||
    /^[-*•]\s*[✓✔☑]\s+/.test(t) ||
    /^\d+[.)]\s*[✓✔☑]\s+/.test(t)
  );
}

function isNumberedListLine(line: string) {
  return /^\d+[.)]\s+\S/.test(line.trim());
}

function isTemplateStepLine(line: string) {
  return /^\d+[.)]?\s+(?:\([^)]+\)\s*)?\S/.test(line.trim());
}

function stripTemplateStepPrefix(line: string) {
  return line.trim().replace(/^\d+[.)]?\s+/, "").trim();
}

function splitTemplateSteps(text: string): string[] | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2 || !lines.every(isTemplateStepLine)) return null;

  const steps = lines.map(stripTemplateStepPrefix).filter(isValidListStep);
  return steps.length >= 2 ? steps : null;
}

function parseTemplateStep(text: string) {
  const trimmed = text.trim();
  const timeMatch = trimmed.match(/^\(([^)]+)\)\s*(.*)$/s);
  if (timeMatch) {
    return {
      time: timeMatch[1]!.trim(),
      body: timeMatch[2]!.trim() || trimmed,
    };
  }
  return { time: null, body: trimmed };
}

function stripChecklistPrefix(line: string) {
  return line
    .trim()
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[✓✔☑]\s*/, "")
    .replace(/^\[[xX ]?\]\s*/, "")
    .replace(/^[-*•]\s*[✓✔☑]?\s*/, "")
    .trim();
}

function splitChecklistItems(
  text: string,
  forceChecklist = false
): string[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 1 && lines.every(isChecklistLine)) {
    const items = lines.map(stripChecklistPrefix).filter(Boolean);
    return items.length > 0 ? items : null;
  }

  if (
    forceChecklist &&
    lines.length >= 1 &&
    lines.every(isNumberedListLine)
  ) {
    const items = lines.map(stripChecklistPrefix).filter(Boolean);
    return items.length > 0 ? items : null;
  }

  if (/[✓✔☑]/.test(trimmed)) {
    const inlineItems = trimmed
      .split(/(?=[✓✔☑]\s*)/)
      .map((part) => stripChecklistPrefix(part))
      .filter(Boolean);
    if (inlineItems.length >= 2) return inlineItems;
  }

  if (forceChecklist) {
    const inlineNumbered = splitNumberedListLines(trimmed);
    if (inlineNumbered && inlineNumbered.steps.length >= 2) {
      return inlineNumbered.steps;
    }
  }

  return null;
}

function isBulletLine(line: string) {
  if (isChecklistLine(line)) return false;
  return /^[\s]*(?:[•\u2022\-*]|\d+[.)])\s+/.test(line);
}

function stripBulletPrefix(line: string) {
  return line.replace(/^[\s]*(?:[•\u2022\-*]|\d+[.)])\s+/, "").trim();
}

function isHeadingLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 90) return false;
  if (/^\*\*.+\*\*$/.test(t)) return true;
  if (/:$/.test(t) && t.length <= 75) return true;
  return false;
}

function cleanHeading(line: string) {
  return line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/:$/, "");
}

function splitInlineBullets(text: string): string[] | null {
  const trimmed = text.trim();
  const bulletMarkers = trimmed.match(/[•\u2022]/g);
  if (!bulletMarkers || bulletMarkers.length < 2) return null;

  const parts = trimmed
    .split(/(?=[•\u2022])/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2 || !parts.every((part) => /^[•\u2022]/.test(part))) {
    return null;
  }

  return parts;
}

function isValidListStep(step: string) {
  const trimmed = step.trim();
  return trimmed.length >= 12 && !/^\d+[.)]?$/.test(trimmed);
}

/** Numbered lists only when each item starts on its own line — avoids splitting "under 2. 3 minutes" mid-sentence. */
function splitNumberedListLines(
  text: string
): { intro: string; steps: string[] } | null {
  if (/[✓✔☑]/.test(text)) return null;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const firstNumberedIndex = lines.findIndex(isNumberedListLine);
  if (firstNumberedIndex === -1) return null;

  const introLines = lines.slice(0, firstNumberedIndex);
  const listLines = lines.slice(firstNumberedIndex);

  if (!listLines.every(isNumberedListLine)) return null;

  const steps = listLines
    .map((line) => line.replace(/^\d+[.)]\s+/, "").trim())
    .filter(isValidListStep);

  if (steps.length < 2) return null;

  return {
    intro: introLines.join(" ").trim(),
    steps,
  };
}

function parseStepQuote(text: string) {
  const cleaned = text.trim();
  const quoteMatch = cleaned.match(
    /^[""“”](.+?)[""“”](?:\s+(.+))?$/s
  );
  if (quoteMatch) {
    return { quote: quoteMatch[1]!.trim(), note: quoteMatch[2]?.trim() };
  }
  return { quote: null, note: cleaned };
}

function StepContent({ text, skill }: { text: string; skill?: LearningSkill }) {
  const { quote, note } = parseStepQuote(text);
  const boldClass = "font-semibold text-text1";

  if (quote) {
    return (
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="rounded-lg bg-[#F4F7FF] px-3 py-2.5 text-[15px] font-medium leading-relaxed text-text1 screen744:text-base">
          <span className="mr-1 text-primary1" aria-hidden>
            &ldquo;
          </span>
          {parseInlineContent(quote, boldClass, skill)}
          <span className="ml-0.5 text-primary1" aria-hidden>
            &rdquo;
          </span>
        </p>
        {note && (
          <p className="text-sm leading-relaxed text-text2">
            {parseInlineContent(note, boldClass, skill)}
          </p>
        )}
      </div>
    );
  }

  return (
    <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-text2 screen744:text-base">
      {parseInlineContent(note, boldClass, skill)}
    </p>
  );
}

function ChecklistList({
  items,
  skill,
}: {
  items: string[];
  skill?: LearningSkill;
}) {
  const boldClass = "font-semibold text-text1";

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#F59E0B]/45 bg-white text-[11px] font-bold leading-none text-[#B45309]"
            aria-hidden
          >
            ✓
          </span>
          <span className="min-w-0 flex-1 text-sm leading-relaxed text-text2 screen744:text-[15px]">
            {parseInlineContent(item, boldClass, skill)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TemplateStepList({
  steps,
  skill,
}: {
  steps: string[];
  skill?: LearningSkill;
}) {
  const boldClass = "font-semibold text-text1";

  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const { time, body } = parseTemplateStep(step);
        return (
          <li
            key={index}
            className="flex gap-3 rounded-xl border border-[#D6E4FF] bg-white/90 p-3 screen744:gap-4 screen744:p-4"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary1 text-sm font-bold text-white"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              {time && (
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary1">
                  {time}
                </p>
              )}
              <p className="text-[15px] leading-relaxed text-text2 screen744:text-base">
                {parseInlineContent(body, boldClass, skill)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ProseOrderedList({
  intro,
  steps,
  skill,
}: {
  intro?: string;
  steps: string[];
  skill?: LearningSkill;
}) {
  const boldClass = "font-semibold text-text1";

  return (
    <div className="space-y-3">
      {intro && (
        <p className="text-[15px] leading-relaxed text-text2 screen744:text-base">
          {parseInlineContent(intro, boldClass, skill)}
        </p>
      )}
      <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-primary1">
        {steps.map((step, index) => (
          <li
            key={index}
            className="pl-1 text-[15px] leading-[1.7] text-text2 screen744:text-base"
          >
            {parseInlineContent(step, boldClass, skill)}
          </li>
        ))}
      </ol>
    </div>
  );
}

function NumberedStepList({
  intro,
  steps,
  variant,
  skill,
}: {
  intro?: string;
  steps: string[];
  variant: Variant;
  skill?: LearningSkill;
}) {
  const isDrill = variant === "drill";
  const boldClass = "font-semibold text-text1";

  return (
    <div className={cn("space-y-3", isDrill && "mt-3")}>
      {intro && (
        <p
          className={cn(
            isDrill
              ? "rounded-xl border border-[#E8EEF9] bg-[#FAFBFC] px-4 py-3 text-[15px] leading-relaxed text-text2 screen744:text-base"
              : "text-[15px] leading-relaxed text-text2 screen744:text-base"
          )}
        >
          {parseInlineContent(intro, boldClass, skill)}
        </p>
      )}
      <ol className="space-y-2.5">
        {steps.map((step, index) => (
          <li
            key={index}
            className={cn(
              "flex gap-3",
              isDrill
                ? "rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm screen744:gap-4 screen744:p-4"
                : "rounded-xl border border-[#E8EEF9] bg-[#FAFBFC] px-4 py-3.5 screen744:px-5"
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
                isDrill
                  ? "h-8 w-8 bg-primary1 text-sm"
                  : "mt-0.5 h-6 w-6 bg-primary1 text-xs"
              )}
              aria-hidden
            >
              {index + 1}
            </span>
            <StepContent text={step} skill={skill} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function BulletList({
  lines,
  isProse,
  skill,
}: {
  lines: string[];
  isProse: boolean;
  skill?: LearningSkill;
}) {
  return (
    <ul
      className={cn(
        "space-y-2.5",
        isProse && "rounded-xl border border-[#E8EEF9] bg-[#FAFBFC] px-4 py-3.5 screen744:px-5"
      )}
    >
      {lines.map((line, index) => (
        <li
          key={index}
          className={cn(
            "flex gap-3",
            isProse
              ? "text-[15px] leading-[1.7] text-text2 screen744:text-base"
              : "text-sm leading-relaxed text-text2"
          )}
        >
          <span
            className={cn(
              "mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full",
              isProse ? "bg-primary1" : "bg-text3"
            )}
            aria-hidden
          />
          <span>
            {parseInlineContent(
              stripBulletPrefix(line),
              "font-semibold text-text1",
              skill
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Paragraph({
  text,
  isProse,
  isLead,
  isDrill,
  skill,
}: {
  text: string;
  isProse: boolean;
  isLead?: boolean;
  isDrill?: boolean;
  skill?: LearningSkill;
}) {
  return (
    <p
      className={cn(
        "whitespace-pre-wrap",
        isDrill &&
          "rounded-xl border border-[#E8EEF9] bg-[#FAFBFC] px-4 py-3 text-[15px] leading-[1.75] text-text2 screen744:text-base",
        isProse &&
          isLead &&
          !isDrill &&
          "rounded-r-xl border-l-[3px] border-primary1 bg-gradient-to-r from-[#F4F7FF] to-transparent py-2 pl-4 text-base leading-[1.8] text-text1 screen744:text-[17px]",
        isProse &&
          !isLead &&
          !isDrill &&
          "text-[15px] leading-[1.75] text-text2 screen744:text-base",
        !isProse && !isDrill && "text-sm leading-relaxed text-text2"
      )}
    >
      {parseInlineContent(text, "font-semibold text-text1", skill)}
    </p>
  );
}

function SectionHeading({ text, isProse }: { text: string; isProse: boolean }) {
  return (
    <h5
      className={cn(
        isProse
          ? "text-base font-bold tracking-tight text-text1 screen744:text-lg"
          : "text-sm font-semibold text-text1"
      )}
    >
      <span
        className={cn(
          isProse && "inline-block border-b-2 border-primary1/25 pb-1.5"
        )}
      >
        {cleanHeading(text)}
      </span>
    </h5>
  );
}

export default function FormattedLessonText({
  text,
  variant = "compact",
  skill,
}: {
  text: string;
  variant?: Variant;
  skill?: LearningSkill;
}) {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  const isProse = variant === "prose";
  const isDrill = variant === "drill";
  const isChecklist = variant === "checklist";
  const isTemplate = variant === "template";
  const useRichProse = isProse || isDrill || isTemplate;
  let paragraphIndex = 0;

  return (
    <div className={cn(useRichProse ? "space-y-4" : "space-y-3")}>
      {blocks.map((block, blockIndex) => {
        const trimmed = block.trim();
        const checklistItems = splitChecklistItems(trimmed, isChecklist);
        if (isChecklist || checklistItems) {
          const items =
            checklistItems ??
            (trimmed ? [stripChecklistPrefix(trimmed)] : []);
          if (items.length === 0) return null;
          return (
            <ChecklistList key={blockIndex} items={items} skill={skill} />
          );
        }

        const lines = trimmed
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        if (isTemplate) {
          const templateSteps = splitTemplateSteps(trimmed);
          if (templateSteps) {
            return (
              <TemplateStepList
                key={blockIndex}
                steps={templateSteps}
                skill={skill}
              />
            );
          }
          return (
            <Paragraph
              key={blockIndex}
              text={trimmed}
              isProse
              skill={skill}
            />
          );
        }

        const numberedList = splitNumberedListLines(trimmed);
        if (numberedList) {
          if (isDrill) {
            return (
              <NumberedStepList
                key={blockIndex}
                intro={numberedList.intro || undefined}
                steps={numberedList.steps}
                variant={variant}
                skill={skill}
              />
            );
          }
          return (
            <ProseOrderedList
              key={blockIndex}
              intro={numberedList.intro || undefined}
              steps={numberedList.steps}
              skill={skill}
            />
          );
        }

        if (lines.length === 1 || (lines.length > 1 && !lines.every(isBulletLine))) {
          const inlineBullets = splitInlineBullets(trimmed);
          if (inlineBullets) {
            return (
              <BulletList
                key={blockIndex}
                lines={inlineBullets}
                isProse={useRichProse}
                skill={skill}
              />
            );
          }
        }

        if (lines.length > 1 && !lines.every(isBulletLine) && !lines.every(isNumberedListLine)) {
          return (
            <div key={blockIndex} className="space-y-2.5">
              {lines.map((line, lineIndex) =>
                isHeadingLine(line) ? (
                  <SectionHeading key={lineIndex} text={line} isProse={useRichProse} />
                ) : isBulletLine(line) ? (
                  <BulletList
                    key={lineIndex}
                    lines={[line]}
                    isProse={useRichProse}
                    skill={skill}
                  />
                ) : (
                  <Paragraph
                    key={lineIndex}
                    text={line}
                    isProse={useRichProse}
                    isDrill={isDrill}
                    skill={skill}
                  />
                )
              )}
            </div>
          );
        }

        if (lines.length > 1 && lines.every(isBulletLine)) {
          if (isDrill) {
            const numberedSteps = lines
              .map(stripBulletPrefix)
              .filter(Boolean);
            return (
              <NumberedStepList
                key={blockIndex}
                steps={numberedSteps}
                variant={variant}
                skill={skill}
              />
            );
          }
          return (
            <BulletList key={blockIndex} lines={lines} isProse={useRichProse} skill={skill} />
          );
        }

        if (lines.length >= 2 && isHeadingLine(lines[0]!)) {
          return (
            <div key={blockIndex} className="space-y-2.5">
              <SectionHeading text={lines[0]!} isProse={useRichProse} />
              {lines.slice(1).every(isBulletLine) ? (
                <BulletList lines={lines.slice(1)} isProse={useRichProse} skill={skill} />
              ) : (
                <Paragraph
                  text={lines.slice(1).join("\n")}
                  isProse={useRichProse}
                  isDrill={isDrill}
                  skill={skill}
                />
              )}
            </div>
          );
        }

        if (lines.length > 1 && lines.some(isBulletLine)) {
          return (
            <div key={blockIndex} className="space-y-2.5">
              {lines.map((line, lineIndex) =>
                isBulletLine(line) ? (
                  <BulletList
                    key={lineIndex}
                    lines={[line]}
                    isProse={useRichProse}
                    skill={skill}
                  />
                ) : isHeadingLine(line) ? (
                  <SectionHeading key={lineIndex} text={line} isProse={useRichProse} />
                ) : (
                  <Paragraph
                    key={lineIndex}
                    text={line}
                    isProse={useRichProse}
                    isDrill={isDrill}
                    skill={skill}
                  />
                )
              )}
            </div>
          );
        }

        if (isHeadingLine(trimmed)) {
          return (
            <SectionHeading key={blockIndex} text={trimmed} isProse={useRichProse} />
          );
        }

        const isLead = isProse && !isDrill && paragraphIndex === 0;
        paragraphIndex += 1;

        return (
          <Paragraph
            key={blockIndex}
            text={trimmed}
            isProse={useRichProse}
            isLead={isLead}
            isDrill={isDrill}
            skill={skill}
          />
        );
      })}
    </div>
  );
}

/** Inline `"bold"` / `'italic'` / **markdown** parsing for any lesson text field. */
export function LessonInlineText({
  text,
  skill,
  className,
}: {
  text: string;
  skill?: LearningSkill;
  className?: string;
}) {
  const content = parseInlineContent(text, LESSON_BOLD_CLASS, skill);
  if (className) {
    return <span className={className}>{content}</span>;
  }
  return <>{content}</>;
}
