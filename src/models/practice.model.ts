import { z } from "zod";
import { ListeningExamDto, ListeningExamEntitySchema } from "./listenExam.model";

const PracticeSchema = ListeningExamEntitySchema;
type TPracticeSchema = z.infer<typeof PracticeSchema>;

const PracticeDtoSchema = ListeningExamDto;
type TPracticeDto = z.infer<typeof PracticeDtoSchema>;

export { PracticeSchema, PracticeDtoSchema };
export type { TPracticeSchema, TPracticeDto };

/** Slim list row for practice side nav (avoids loading passage JSON for every item). */
export type TPracticeNavItem = Pick<
  TPracticeDto,
  "id" | "taskId" | "name" | "type" | "isFree"
>;
