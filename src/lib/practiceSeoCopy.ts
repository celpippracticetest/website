import type { TPracticeDto } from "@/models/practice.model";
import type { TTaskSchemaDto } from "@/models/tasks.model";
import type { SkillRoute } from "@/lib/practiceRoutes";

const SKILL_LABEL: Record<SkillRoute, string> = {
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  listening: "Listening",
};

function taskNumberDigits(task: TTaskSchemaDto): string {
  const raw = task.taskNumber?.trim() ?? "";
  if (!raw) return "1";
  const n = raw.replace(/\D/g, "");
  return n || raw;
}

function titleBenefitSuffix(practice: TPracticeDto): string {
  if (practice.isFree) return " (Free sample + tips)";
  return " (Timed practice + feedback)";
}

/** Front-loaded title: task name first, CELPIP skill task N, variant, then benefit hook. */
export function buildPracticePageTitle(
  skill: SkillRoute,
  task: TTaskSchemaDto,
  practice: TPracticeDto
): string {
  const taskName = task.name.trim();
  const n = taskNumberDigits(task);
  const variant = (practice.title || practice.name).trim();
  return `${taskName} – CELPIP ${SKILL_LABEL[skill]} Task ${n} Practice | ${variant}${titleBenefitSuffix(practice)}`;
}

export function buildPracticePageH1(
  skill: SkillRoute,
  task: TTaskSchemaDto,
  practice: TPracticeDto
): string {
  const taskName = task.name.trim();
  const n = taskNumberDigits(task);
  const variant = (practice.title || practice.name).trim();
  return `${taskName} – CELPIP ${SKILL_LABEL[skill]} Task ${n}: ${variant}`;
}

export function buildPracticeMetaDescription(
  skill: SkillRoute,
  task: TTaskSchemaDto,
  practice: TPracticeDto
): string {
  const base =
    practice.description?.trim() ||
    practice.instructions?.[0]?.trim() ||
    `${practice.title || practice.name} — Timed CELPIP ${SKILL_LABEL[skill]} practice for ${task.name.trim()}.`;
  const benefit = practice.isFree
    ? " Free sample with tips."
    : " Timed practice with feedback.";
  let clipped = base.replace(/\s+/g, " ").trim();
  const maxWithBenefit = 158;
  if (clipped.length + benefit.length <= maxWithBenefit) {
    clipped = `${clipped}${benefit}`;
  } else if (clipped.length > maxWithBenefit) {
    clipped = `${clipped.slice(0, 155)}…`;
  }
  return clipped;
}

export function absoluteUrl(path: string): string {
  const base = process.env.APP_BASE_URL || "https://celpippracticetest.com";
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
}
