import type { TPracticeDto } from "@/models/practice.model";

/**
 * What the browser may see of practice prompts.
 *
 * Practice pages and the public practices API used to send every prompt in a
 * task with full passages, audio, questions and answer keys, so the paid bank
 * could be copied from the page data. Lists only need id / name / title /
 * isFree / type / taskId, so strip the content.
 */

/** Entry for lists (side menu, task list): no passages, questions or answers. */
export function toPracticeListItem(practice: TPracticeDto): TPracticeDto {
  return { ...practice, passages: [] };
}

/** A locked prompt the user can't open: keep the questions, drop the answers. */
export function withoutAnswerKeys(practice: TPracticeDto): TPracticeDto {
  return {
    ...practice,
    passages: practice.passages.map((passage) => ({
      ...passage,
      questions: passage.questions?.map((question) => ({
        ...question,
        answer: "",
      })),
    })),
  };
}
