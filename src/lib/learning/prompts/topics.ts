export const LISTENING_TOPICS = [
  "Numbers, dates, and units",
  "Part 1 problem-solving dialogues",
  "Part 2 daily-life conversations",
  "Part 3 information discussions",
  "Part 4 news and instructional talks",
  "Part 5 opinion monologues",
  "Distractor control (similar words)",
  "Pre-listening question preview",
] as const;

export const READING_TOPICS = [
  "Skimming vs scanning",
  "Correspondence tasks",
  "Fill-in-the-blank",
  "Reading to apply a diagram",
  "Reading for information",
  "Inference and implied meaning",
  "Vocabulary in context",
  "Reading for viewpoints",
] as const;

export const WRITING_TOPICS = [
  "Task 1 email structure",
  "Task 2 survey response",
  "Coherence and paragraphing",
  "Linking words and transitions",
  "Tone and register",
  "Grammar accuracy",
  "Vocabulary range",
  "Task fulfillment and word count",
] as const;

export const SPEAKING_TOPICS = [
  "Giving advice",
  "Describing a scene",
  "Compare and persuade",
  "Fluency and pacing",
  "Sentence stress and intonation",
  "Vocabulary range",
  "Organization (hook → points → close)",
  "Task fulfillment under time pressure",
] as const;

export const LISTENING_EXAM_TASKS = [
  "Listening Part 1: Problem Solving",
  "Listening Part 2: Daily Life Conversation",
  "Listening Part 3: Listening for Information",
  "Listening Part 4: News Item",
  "Listening Part 5: Discussion",
  "Listening Part 6: Viewpoints",
  "Listening: Multiple-choice distractor control",
  "Listening: Pre-listening question preview",
] as const;

export const READING_EXAM_TASKS = [
  "Reading Part 1: Correspondence",
  "Reading Part 2: Apply a Diagram",
  "Reading Part 3: Reading for Information",
  "Reading Part 4: Reading for Viewpoints",
  "Reading: Skimming and scanning",
  "Reading: Inference questions",
  "Reading: Vocabulary in context",
  "Reading: Viewpoint identification",
] as const;

export const WRITING_EXAM_TASKS = [
  "Writing Task 1: Writing an Email",
  "Writing Task 2: Responding to Survey Questions",
  "Writing Task 1/2: Coherence and paragraphing",
  "Writing Task 1/2: Linking and transitions",
  "Writing Task 1: Tone and register",
  "Writing Task 1/2: Grammar accuracy",
  "Writing Task 2: Vocabulary range",
  "Writing Task 1/2: Task fulfillment",
] as const;

export const SPEAKING_EXAM_TASKS = [
  "Speaking Task 1: Giving Advice",
  "Speaking Task 3: Describing a Scene",
  "Speaking Task 6: Dealing with a Difficult Situation",
  "Speaking Task 2: Talking about a Personal Experience",
  "Speaking Task 4: Making Predictions",
  "Speaking Task 5: Comparing and Persuading",
  "Speaking Task 7: Expressing Opinions",
  "Speaking Task 8: Describing an Unusual Situation",
] as const;

import type { LearningSkill } from "../types";

export function getLessonTopic(skill: LearningSkill, sequenceNumber: number): string {
  const index = (Math.max(1, sequenceNumber) - 1) % 8;
  switch (skill) {
    case "LISTENING":
      return LISTENING_TOPICS[index]!;
    case "READING":
      return READING_TOPICS[index]!;
    case "WRITING":
      return WRITING_TOPICS[index]!;
    case "SPEAKING":
      return SPEAKING_TOPICS[index]!;
  }
}

export function getExamTask(skill: LearningSkill, sequenceNumber: number): string {
  const index = (Math.max(1, sequenceNumber) - 1) % 8;
  switch (skill) {
    case "LISTENING":
      return LISTENING_EXAM_TASKS[index]!;
    case "READING":
      return READING_EXAM_TASKS[index]!;
    case "WRITING":
      return WRITING_EXAM_TASKS[index]!;
    case "SPEAKING":
      return SPEAKING_EXAM_TASKS[index]!;
  }
}
