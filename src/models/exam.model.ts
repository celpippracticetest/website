import { ObjectId } from "bson";
import { z } from "zod";

const ExamSchema = z.object({
  _id: z.instanceof(ObjectId),
  name: z.string(),
  order: z.number(),
  createdAt: z.date(),
  isReady: z.boolean().default(false),
});

const ExamSchemaDto = z.object({
  id: z.string(),
  ...ExamSchema.omit({ _id: true }).shape,
});

type TExamSchema = z.infer<typeof ExamSchema>;
type TExamSchemaDto = z.infer<typeof ExamSchemaDto>;

export { ExamSchema, ExamSchemaDto };
export type { TExamSchema, TExamSchemaDto };
