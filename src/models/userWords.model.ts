import { z } from "zod";
import { ObjectId } from "bson";

export const UserWordSchema = z.object({
    _id: z.instanceof(ObjectId),
    userId: z.string(),
    word: z.string(),
    isLearned: z.boolean().optional().default(false),
    reviewedTimes: z.number().int().nonnegative().optional().default(0),
    complexityLevel: z.enum(["beginner", "intermediate", "advanced"]).optional().default("intermediate"),
    createdAt: z.date(),
});

export type TUserWord = z.infer<typeof UserWordSchema>;

export const UserWordSchemaDto = z.object({
    id: z.string(),
    userId: z.string(),
    word: z.string(),
    isLearned: z.boolean().optional(),
    reviewedTimes: z.number().int().nonnegative().optional().default(0),
    complexityLevel: z.enum(["beginner", "intermediate", "advanced"]).optional().default("intermediate"),
    createdAt: z.date(),
});

export type TUserWordDto = z.infer<typeof UserWordSchemaDto>;
