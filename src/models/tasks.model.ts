import { ObjectId } from "mongodb";
import { z } from "zod";
import { DifficultyEnumSchema } from "./enums";

const TaskTypeEnumSchema = z.enum(["practice"]);

const TaskCategoryEnumSchema = z.enum(["listening", "reading", "writing", "speaking"]);

const TaskSchema = z.object({
  _id: z.instanceof(ObjectId),
  name: z.string(),
  type: TaskTypeEnumSchema,
  isFree: z.boolean().default(false),
  category: TaskCategoryEnumSchema,
  numberOfPractices: z.number().default(0),
  difficulty: DifficultyEnumSchema.default('beginner'),
  taskNumber: z.string(), 
  practiceCount: z.number().optional(),
  description: z.string().optional(),
  antropicCommand: z.object({
    systemPrompt: z.string(),
    userPrompt: z.string(),
  }).optional(),
});

const TaskSchemaDto = z.object({
  id: z.string(),
  ...TaskSchema.omit({ _id: true }).shape,
});

type TTaskSchema = z.infer<typeof TaskSchema>;
type TTaskSchemaDto = z.infer<typeof TaskSchemaDto>;

type TTaskCategoryEnum = z.infer<typeof TaskCategoryEnumSchema>;
type TTaskTypeEnum = z.infer<typeof TaskTypeEnumSchema>;

export { TaskTypeEnumSchema, TaskCategoryEnumSchema, TaskSchema, TaskSchemaDto };
export type { TTaskSchema, TTaskCategoryEnum, TTaskTypeEnum, TTaskSchemaDto };
