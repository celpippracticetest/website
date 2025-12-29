import { z } from "zod";
import { ObjectId } from "mongodb";

export const UserWordSchema = z.object({
    _id: z.instanceof(ObjectId),
    userId: z.string(),
    word: z.string(),
    isLearned: z.boolean().optional().default(false),
    createdAt: z.date(),
});

export type TUserWord = z.infer<typeof UserWordSchema>;

export const UserWordSchemaDto = z.object({
    id: z.string(),
    userId: z.string(),
    word: z.string(),
    isLearned: z.boolean().optional(),
    createdAt: z.date(),
});

export type TUserWordDto = z.infer<typeof UserWordSchemaDto>;
