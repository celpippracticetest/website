import type { SkillRoute } from "@/lib/practiceRoutes";
import type { TTaskSchemaDto } from "@/models/tasks.model";

export const PRACTICE_OVERVIEW_PATH = "/practice-overview";

export const SKILL_HUB_LABEL: Record<SkillRoute, string> = {
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  listening: "Listening",
};

export function buildTaskBreadcrumbLabel(task: TTaskSchemaDto): string {
  return `${task.taskNumber?.replace(" #", "") ?? task.taskNumber}.${task.name}`;
}

export function buildTaskPickerPageH1(
  skill: SkillRoute,
  task: TTaskSchemaDto
): string {
  const taskName = task.name.trim();
  const n = (task.taskNumber?.replace(/\D/g, "") || "1").trim();
  return `${taskName} – CELPIP ${SKILL_HUB_LABEL[skill]} Task ${n}`;
}
