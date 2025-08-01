import { z } from "zod";

const DifficultyEnumSchema = z.enum(["beginner", "intermediate", "advanced"]);
type TDifficultyEnum = z.infer<typeof DifficultyEnumSchema>;

const QuestionTypeEnum = z.enum(["MULTIPLE_CHOICE_QUESTION", "FILL_THE_GAP"]);
type TQuestionTypeEnum = z.infer<typeof QuestionTypeEnum>;

const ExamType = z.enum(["LISTENING", "READING", "WRITING", "SPEAKING"]);
type TExamType = z.infer<typeof ExamType>;

export { DifficultyEnumSchema, QuestionTypeEnum, ExamType };
export type { TDifficultyEnum, TQuestionTypeEnum, TExamType };
