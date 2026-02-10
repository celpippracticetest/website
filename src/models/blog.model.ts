import { ObjectId } from "mongodb";
import { z } from "zod";

const BlogStatusEnumSchema = z.enum(["draft", "published"]);

const BlogSeoSchema = z.object({
  metaTitle: z.string().trim().max(70).optional(),
  metaDescription: z.string().trim().max(160).optional(),
  canonicalUrl: z.string().trim().optional(),
  ogImageUrl: z.string().trim().optional(),
  ogImageAlt: z.string().trim().optional(),
  keywords: z.array(z.string().trim()).default([]),
});

const BlogFeaturedImageSchema = z.object({
  url: z.string().trim().min(1),
  alt: z.string().trim().default(""),
});

const BlogFaqItemSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

const BlogAiSnippetSchema = z.object({
  question: z.string().trim().default(""),
  answer: z.string().trim().default(""),
});

const BlogEditorJsonSchema = z.record(z.any());

const BlogWriteSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  excerpt: z.string().trim().max(320).default(""),
  contentHtml: z.string().default(""),
  contentJson: BlogEditorJsonSchema.nullable().optional(),
  status: BlogStatusEnumSchema.default("draft"),
  authorName: z.string().trim().min(2).max(80).default("CELPIP Practice Test Team"),
  categories: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
  featuredImage: BlogFeaturedImageSchema.optional(),
  faq: z.array(BlogFaqItemSchema).optional().default([]),
  aiSnippet: BlogAiSnippetSchema.optional(),
  seo: BlogSeoSchema.default({
    keywords: [],
  }),
  publishedAt: z.coerce.date().nullable().optional(),
});

const BlogSchema = z.object({
  _id: z.instanceof(ObjectId),
  ...BlogWriteSchema.shape,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const BlogSchemaDto = z.object({
  id: z.string(),
  ...BlogSchema.omit({ _id: true }).shape,
});

type TBlogStatus = z.infer<typeof BlogStatusEnumSchema>;
type TBlogSchema = z.infer<typeof BlogSchema>;
type TBlogSchemaDto = z.infer<typeof BlogSchemaDto>;
type TBlogWriteInput = z.infer<typeof BlogWriteSchema>;

export {
  BlogStatusEnumSchema,
  BlogSeoSchema,
  BlogFeaturedImageSchema,
  BlogFaqItemSchema,
  BlogAiSnippetSchema,
  BlogWriteSchema,
  BlogSchema,
  BlogSchemaDto,
};
export type { TBlogStatus, TBlogSchema, TBlogSchemaDto, TBlogWriteInput };
