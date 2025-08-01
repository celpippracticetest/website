import { z } from "zod";
import { ListeningExamEntitySchema } from "./listenExam.model";
import { ObjectId } from "mongodb";

const ExamPartSchema = z.object({
    _id: z.instanceof(ObjectId),
    examId: z.instanceof(ObjectId),
    partId: z.number(),
    ...ListeningExamEntitySchema.omit({ _id: true, isFree: true, difficulty: true, taskId: true,  }).shape,
});
type TExamPartSchema = z.infer<typeof ExamPartSchema>;

const ExamPartSchemaDto = z.object({
  id: z.string(),
  examId: z.string(),
  ...ExamPartSchema.omit({ _id: true, examId: true }).shape,
});

type TExamPartSchemaDto = z.infer<typeof ExamPartSchemaDto>;

export { ExamPartSchema, ExamPartSchemaDto };
export type { TExamPartSchema, TExamPartSchemaDto };
