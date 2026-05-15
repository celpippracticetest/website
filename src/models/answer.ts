import { ObjectId } from "bson";
import { text } from "stream/consumers";
import { z } from "zod";
import { ExamType } from "./enums";

const WritingAnswerRequestSchema = z.object({
  text: z.string(),
  practiceId: z.string().optional(),
  examId: z.string().optional(),
  partId: z.number().optional(),
  attemptId: z.string().nullable().optional(),
});

const ListeningAndReadingAnswerSchemaRequest = z.object({
  answers: z.record(z.string(), z.string()),
  practiceId: z.string().optional(),
  examId: z.string().optional(),
  partId: z.number().optional(),
  attemptId: z.string().nullable().optional()
});
const ListeningAndReadingAnswer = z.object({
  _id: z.instanceof(ObjectId),
  answers: z.record(z.string(), z.string()),
  practiceId: z.string().optional(),
  taskId: z.string().optional(),
  examId: z.string().optional(),
  partId: z.number().optional(),
  userId: z.string(),
  attemptId: z.string().nullable().optional(),
  type: ExamType.optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

const WritingAnswerSchema = z.object({
  _id: z.instanceof(ObjectId),
  text: z.string().optional(),
  audioUrl: z.string().optional(),
  userId: z.string(),
  practiceId: z.string().optional(),
  examId: z.string().optional(),
  partId: z.number().optional(),
  overalScore: z.number().optional(),
  attemptId: z.string().nullable().optional(),
  type: z.enum(["WRITING", "SPEAKING"]).optional(),
  result: z
    .object({
      overall: z.number().optional(),
      contentAndCoherence: z.number().optional(),
      vocabulary: z.number().optional(),
      readabilityAndGrammar: z.number().optional(),
      taskFulfillment: z.number().optional(),
      feedback: z.string().optional(),
      grammarMistakes: z
        .array(
          z.object({
            original: z.string().optional(),
            improvement: z.string().nullable().optional(),
          })
        )
        .optional(),
      betterVersion: z.string().optional(),
    })
    .optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
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

/** Lean `answers` row (e.g. from `app_documents`) → DTO. */
export function writingAnswerDtoFromLeanDocument(doc: unknown): TWritingAnswerDto {
  const row = doc as TWritingAnswer;
  return WritingAnswerDto.parse({
    ...row,
    id: row._id.toHexString(),
  });
}

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
