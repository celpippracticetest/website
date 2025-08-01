import { z } from "zod";
import { QuestionTypeEnum } from "./enums";

const MultiChoiceOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

const MultiChoiceQuestionSchema = z.object({
  id: z.string(),
  question: z.string().optional(),
  choices: z.array(MultiChoiceOptionSchema),
  type: QuestionTypeEnum,
  answer: z.string(),
  audioUrl: z.string().optional(),
  description: z.string().optional(),
});



const QuestionSchema = MultiChoiceQuestionSchema;

type TMultiChoiceQuestionSchema = z.infer<typeof MultiChoiceQuestionSchema>;
type TMultiChoiceOptionSchema = z.infer<typeof MultiChoiceOptionSchema>;
type TQuestion = z.infer<typeof QuestionSchema>;

export { MultiChoiceQuestionSchema, MultiChoiceOptionSchema, QuestionSchema };
export type { TMultiChoiceQuestionSchema, TMultiChoiceOptionSchema, TQuestion };
