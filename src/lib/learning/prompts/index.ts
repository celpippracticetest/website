import type { LearningSkill } from "../types";
import {
  buildListeningLessonPrompt,
  buildReadingLessonPrompt,
  buildSpeakingLessonPrompt,
  buildWritingLessonPrompt,
  type LessonPromptInput,
} from "./skill-prompts";

export { getExamTask, getLessonTopic } from "./topics";
export { DAILY_LEARNING_SYSTEM_PROMPT, fillPromptTemplate } from "./system";

export function buildSkillUserPrompt(
  skill: LearningSkill,
  input: LessonPromptInput
): string {
  switch (skill) {
    case "LISTENING":
      return buildListeningLessonPrompt(input);
    case "READING":
      return buildReadingLessonPrompt(input);
    case "WRITING":
      return buildWritingLessonPrompt(input);
    case "SPEAKING":
      return buildSpeakingLessonPrompt(input);
  }
}
