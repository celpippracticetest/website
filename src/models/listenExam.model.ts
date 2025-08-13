import z from "zod";
import { QuestionSchema } from "./question.model";
import { DifficultyEnumSchema, ExamType } from "./enums";
import { ObjectId, UUID } from "mongodb";
const SampleResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string().optional(),
  body: z.string(),
});
const PassageSchema = z.object({
  id: z.string().default(UUID.generate().toString()),
  title: z.string(),
  audioUrl: z.string().optional(),
  pictureUrl: z.string().optional(),
  setting: z.string().optional(),
  conversation: z
    .array(z.object({ name: z.string(), text: z.string() }))
    .optional(),
  body: z.string().optional(),
  questions: z.array(QuestionSchema).optional(),
  sampleResponse: z.array(SampleResponseSchema).optional(),
});
const ListeningExamEntitySchema = z.object({
  _id: z.instanceof(ObjectId),
  title: z.string(),
  name: z.string(), //Listening to Problem Solving
  description: z.union([z.string(), z.array(z.string())]).optional(),
  instructions: z.array(z.string()).optional(), //You will hear three conversations where one person is seeking advice or help with a problem.
  passages: z.array(PassageSchema),
  type: ExamType.default("LISTENING"),
  isFree: z.boolean().optional(),
  duration: z.string().optional(),
  taskId: z.instanceof(ObjectId),
  difficulty: DifficultyEnumSchema.optional(),
  totalQuestion: z.number().optional(),
  totalPassages: z.number().optional(),
});

const ListeningExamDto = z.object({
  id: z.string(),
  taskId: z.string(),
  ...ListeningExamEntitySchema.omit({ _id: true, taskId: true }).shape,
});
type TPassage = z.infer<typeof PassageSchema>;
type TListeningExamEntitySchema = z.infer<typeof ListeningExamEntitySchema>;
type TListeningExamDto = z.infer<typeof ListeningExamDto>;
type TSampleResponseSchema = z.infer<typeof SampleResponseSchema>;
export { ListeningExamEntitySchema, ListeningExamDto, SampleResponseSchema };
export type {
  TListeningExamEntitySchema,
  TListeningExamDto,
  TPassage,
  TSampleResponseSchema,
};
