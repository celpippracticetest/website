import { ObjectId } from "mongodb";
import { z } from "zod";

const WikiArticleWriteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  description: z.string().trim().max(500).default(""),
  category: z.string().trim().min(1).max(80).default("General"),
  color: z.string().trim().max(50).default("#3ebbf3"),
  summary: z.string().trim().max(500).default(""),
  content: z.string().min(0),
  sortOrder: z.number().int().min(0).default(0),
});

const WikiArticleSchema = z.object({
  _id: z.instanceof(ObjectId),
  ...WikiArticleWriteSchema.shape,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const WikiArticleSchemaDto = z.object({
  id: z.string(),
  ...WikiArticleSchema.omit({ _id: true }).shape,
});

type TWikiArticleSchema = z.infer<typeof WikiArticleSchema>;
type TWikiArticleSchemaDto = z.infer<typeof WikiArticleSchemaDto>;
type TWikiArticleWriteInput = z.infer<typeof WikiArticleWriteSchema>;

export { WikiArticleWriteSchema, WikiArticleSchema, WikiArticleSchemaDto };
export type { TWikiArticleSchema, TWikiArticleSchemaDto, TWikiArticleWriteInput };
