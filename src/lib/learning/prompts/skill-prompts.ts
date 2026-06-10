import { fillPromptTemplate } from "./system";

export type LessonPromptInput = {
  currentClb: number;
  targetClb: number;
  sequenceNumber: number;
  lessonTopic: string;
  examTask: string;
};

function calibrationBlock(currentClb: number, targetClb: number): string {
  const gap = targetClb - currentClb;
  if (gap >= 3) {
    return fillPromptTemplate(
      "CALIBRATION: This is a large gap ({{GAP}} levels). Prioritize foundational habits that build steadily — one clear technique per lesson, not advanced CLB 10+ tricks. Use examples appropriate for CLB {{CURRENT_CLB}} learners.",
      { GAP: gap, CURRENT_CLB: currentClb }
    );
  }
  if (gap === 1) {
    return fillPromptTemplate(
      "CALIBRATION: User is close to target. Focus on polish, error avoidance, and the 1-2 habits that distinguish CLB {{CURRENT_CLB}} from CLB {{TARGET_CLB}}.",
      { CURRENT_CLB: currentClb, TARGET_CLB: targetClb }
    );
  }
  return "";
}

function baseUserPrompt(
  skillName: string,
  contextBullets: string[],
  input: LessonPromptInput
): string {
  const calibration = calibrationBlock(input.currentClb, input.targetClb);
  const context = contextBullets.map((b) => `- ${b}`).join("\n");

  return fillPromptTemplate(
    `Create today's CELPIP {{SKILL_NAME}} daily lesson.

Profile: current CLB {{CURRENT_CLB}}, target CLB {{TARGET_CLB}}.
Exam task: {{EXAM_TASK}}.
Lesson {{SEQUENCE_NUMBER}} in curriculum.
Today's focus topic: {{LESSON_TOPIC}}.

CELPIP {{SKILL_NAME}} context:
{{CONTEXT}}

Deliver premium curriculum content for CLB {{CURRENT_CLB}}→{{TARGET_CLB}} aligned with {{EXAM_TASK}} and {{LESSON_TOPIC}}.
Include rubricComparison with four objects (contentCoherence, vocabulary, listenabilityReadability, taskFulfillment). Each object must have clbCurrentHabits and clbTargetUpgrades strings with 2-3 bullet points (use \\u2022 prefix).
vocabularyBank: 3-5 high-value terms for this task.
coreLesson: 400-600 words with clear sub-headings as plain text.
mentalTemplate: timed step-by-step outline for {{EXAM_TASK}}.
exemplarAnalysis: realistic CLB {{CURRENT_CLB}} sample upgraded to CLB {{TARGET_CLB}} with pedagogical analysis.
actionableDrills: 1-2 drills doable in 5-10 minutes on CelpipPracticeTest.com or aloud.

{{CALIBRATION}}

Return JSON only.`,
    {
      SKILL_NAME: skillName,
      CURRENT_CLB: input.currentClb,
      TARGET_CLB: input.targetClb,
      EXAM_TASK: input.examTask,
      SEQUENCE_NUMBER: input.sequenceNumber,
      LESSON_TOPIC: input.lessonTopic,
      CONTEXT: context,
      CALIBRATION: calibration,
    }
  );
}

export function buildListeningLessonPrompt(input: LessonPromptInput): string {
  return baseUserPrompt("Listening", [
    "6 parts, ~47 minutes total, audio plays once per section.",
    "Question types: multiple choice, select missing word, dropdown blanks.",
    "Common traps: numbers/dates/units, paraphrasing, similar-sounding distractors.",
  ], input);
}

export function buildReadingLessonPrompt(input: LessonPromptInput): string {
  return baseUserPrompt("Reading", [
    "4 parts, ~55 minutes; correspondence, diagrams, information texts, viewpoints.",
    "Question types: MCQ, fill-in-blank, dropdown, ordering.",
    "Skills: skimming, scanning, inference, vocabulary-in-context.",
  ], input);
}

export function buildWritingLessonPrompt(input: LessonPromptInput): string {
  return baseUserPrompt("Writing", [
    "Task 1: email (~150-200 words); Task 2: survey opinion (~150-200 words).",
    "Scored on: Content/Coherence, Vocabulary, Readability/Grammar, Task Fulfillment.",
    "Formal/neutral tone; paragraph structure and linking words matter.",
  ], input);
}

export function buildSpeakingLessonPrompt(input: LessonPromptInput): string {
  return baseUserPrompt("Speaking", [
    "8 tasks, ~15-20 minutes; prep time then recorded response.",
    "Tasks: advice, personal experience, describe scene, predictions, compare/persuade, difficult situation, opinions, unusual situation.",
    "Scored on: Fluency, Pronunciation, Vocabulary, Organization, Task Fulfillment.",
  ], input);
}
