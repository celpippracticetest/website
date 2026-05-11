import { z } from "zod";
import { ObjectId } from "bson";

/**
 * Base Zod Schema for Internal Link data (without DB metadata)
 */
export const InternalLinkWriteSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  url: z.string().min(1, "URL is required"),
  exactMatch: z.boolean().default(false),
});

/**
 * Internal Link Schema as stored in DB (with _id, timestamps)
 */
export const InternalLinkSchema = InternalLinkWriteSchema.extend({
  _id: z.instanceof(ObjectId),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * DTO for frontend use (serializable)
 */
export const InternalLinkSchemaDto = InternalLinkWriteSchema.extend({
  id: z.string(),
  createdAt: z.string(), // ISO string
  updatedAt: z.string(), // ISO string
});

export type InternalLinkWrite = z.infer<typeof InternalLinkWriteSchema>;
export type InternalLink = z.infer<typeof InternalLinkSchema>;
export type InternalLinkDto = z.infer<typeof InternalLinkSchemaDto>;
