import { ObjectId } from "mongodb";
import { text } from "stream/consumers";
import { z } from "zod";
import { ExamType } from "./enums";

const WritingAnswerRequestSchema = z.object({
  text: z.string(),
  practiceId: z.string().optional(),
  examId: z.string().optional(),
  partId: z.number().optional(),
  attemptId: z.string().optional(),
});

const ListeningAndReadingAnswerSchemaRequest = z.object({
  answers: z.record(z.string(), z.string()),
  practiceId: z.string().optional(),
  examId: z.string().optional(),
  partId: z.number().optional(),
  attemptId: z.string().optional()
});
const ListeningAndReadingAnswer = z.object({
  _id: z.instanceof(ObjectId),
  answers: z.record(z.string(), z.string()),
  practiceId: z.string().optional(),
  taskId: z.string().optional(),
  examId: z.string().optional(),
  partId: z.number().optional(),
  userId: z.string(),
  attemptId: z.string().optional(),
  type: ExamType,
  createdAt: z.date(),
  updatedAt: z.date(),
})

const WritingAnswerSchema = z.object({
  _id: z.instanceof(ObjectId),
  text: z.string().optional(),
  audioUrl: z.string().optional(),
  userId: z.string(),
  practiceId: z.string().optional(),
  examId: z.string().optional(),
  partId: z.number().optional(),
  overalScore: z.number(),
  attemptId: z.string().optional(),
  type: z.enum(["WRITING", "SPEAKING"]),
  result: z.object({
    overall: z.number(),
    contentAndCoherence: z.number(),
    vocabulary: z.number(),
    readabilityAndGrammar: z.number(),
    taskFulfillment: z.number(),
    feedback: z.string(),
    grammarMistakes: z.array(
      z.object({
        original: z.string(),
        improvement: z.string().nullable(),
      })
    ),
    betterVersion: z.string(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const WritingAnswerDto = z.object({
  id: z.string(),
  ...WritingAnswerSchema.omit({ _id: true }).shape,
});
const ListeningAndReadingAnswerDto = z.object({
  id: z.string(),
  ...ListeningAndReadingAnswer.omit({ _id: true }).shape,
});

type TWritingAnswerRequest = z.infer<typeof WritingAnswerRequestSchema>;
type TWritingAnswer = z.infer<typeof WritingAnswerSchema>;
type TWritingAnswerDto = z.infer<typeof WritingAnswerDto>;

type TListeningAndReadingAnswerRequest = z.infer<typeof ListeningAndReadingAnswerSchemaRequest>;
type TListeningAndReadingAnswer = z.infer<typeof ListeningAndReadingAnswer>;
type TListeningAndReadingAnswerDto = z.infer<typeof ListeningAndReadingAnswerDto>;
export {
  WritingAnswerRequestSchema,
  WritingAnswerSchema,
  WritingAnswerDto,
  ListeningAndReadingAnswerSchemaRequest,
  ListeningAndReadingAnswer,
  ListeningAndReadingAnswerDto
};
export type {
  TWritingAnswerRequest,
  TWritingAnswer,
  TWritingAnswerDto,
  TListeningAndReadingAnswer,
  TListeningAndReadingAnswerDto,
  TListeningAndReadingAnswerRequest
};
