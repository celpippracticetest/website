import { z } from "zod";
import { ObjectId } from "mongodb";

export const UserWordSchema = z.object({
    _id: z.instanceof(ObjectId),
    userId: z.string(),
    word: z.string(),
    createdAt: z.date(),
});

export type TUserWord = z.infer<typeof UserWordSchema>;

export const UserWordSchemaDto = z.object({
    id: z.string(),
    userId: z.string(),
    word: z.string(),
    createdAt: z.date(),
});

export type TUserWordDto = z.infer<typeof UserWordSchemaDto>;
