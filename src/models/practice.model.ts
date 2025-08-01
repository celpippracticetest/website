import { z } from "zod";
import { ListeningExamDto, ListeningExamEntitySchema } from "./listenExam.model";

const PracticeSchema = ListeningExamEntitySchema;
type TPracticeSchema = z.infer<typeof PracticeSchema>;

const PracticeDtoSchema = ListeningExamDto;
type TPracticeDto = z.infer<typeof PracticeDtoSchema>;

export { PracticeSchema, PracticeDtoSchema };
export type { TPracticeSchema, TPracticeDto };
