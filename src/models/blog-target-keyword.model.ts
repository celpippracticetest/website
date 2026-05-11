import { ObjectId } from "bson";
import { z } from "zod";

const BlogTargetKeywordWriteSchema = z.object({
  phrase: z.string().trim().min(1, "Phrase is required.").max(200),
  notes: z.string().trim().max(500).optional().default(""),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
});

/** Stored document includes phraseKey for case-insensitive uniqueness. */
const BlogTargetKeywordSchema = z.object({
  _id: z.instanceof(ObjectId),
  phrase: z.string().trim().min(1).max(200),
  phraseKey: z.string().trim().min(1),
  notes: z.string().trim().max(500).default(""),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const BlogTargetKeywordSchemaDto = z.object({
  id: z.string(),
  phrase: z.string(),
  notes: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type TBlogTargetKeywordSchema = z.infer<typeof BlogTargetKeywordSchema>;
type TBlogTargetKeywordSchemaDto = z.infer<typeof BlogTargetKeywordSchemaDto>;
type TBlogTargetKeywordWriteInput = z.infer<typeof BlogTargetKeywordWriteSchema>;

export {
  BlogTargetKeywordWriteSchema,
  BlogTargetKeywordSchema,
  BlogTargetKeywordSchemaDto,
};
export type {
  TBlogTargetKeywordSchema,
  TBlogTargetKeywordSchemaDto,
  TBlogTargetKeywordWriteInput,
};
