import { ObjectId } from "mongodb";
import { z } from "zod";

const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
    message: "Invalid date.",
  });

const HomepageHeroScheduleWriteBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  imageUrl: z.string().trim().min(1).max(1000),
  altText: z.string().trim().min(1).max(180),
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
  priority: z.number().int().min(0).max(1000).default(100),
  isEnabled: z.boolean().default(true),
});

const HomepageHeroScheduleWriteSchema = HomepageHeroScheduleWriteBaseSchema.refine((value) => value.startDate <= value.endDate, {
    message: "End date must be the same as or after the start date.",
    path: ["endDate"],
  });

const HomepageHeroScheduleSchema = z.object({
  _id: z.instanceof(ObjectId),
  scheduleKey: z.string().min(1),
  ...HomepageHeroScheduleWriteBaseSchema.shape,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const HomepageHeroScheduleSchemaDto = z.object({
  id: z.string(),
  ...HomepageHeroScheduleSchema.omit({ _id: true }).shape,
});

type THomepageHeroScheduleWriteInput = z.infer<
  typeof HomepageHeroScheduleWriteSchema
>;
type THomepageHeroScheduleSchema = z.infer<typeof HomepageHeroScheduleSchema>;
type THomepageHeroScheduleSchemaDto = z.infer<
  typeof HomepageHeroScheduleSchemaDto
>;

export {
  DateOnlySchema,
  HomepageHeroScheduleWriteBaseSchema,
  HomepageHeroScheduleWriteSchema,
  HomepageHeroScheduleSchema,
  HomepageHeroScheduleSchemaDto,
};
export type {
  THomepageHeroScheduleWriteInput,
  THomepageHeroScheduleSchema,
  THomepageHeroScheduleSchemaDto,
};
