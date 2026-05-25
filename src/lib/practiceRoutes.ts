/**
 * Practice URL helpers (path-based deep links are noindex; prefer linking to hubs and
 * `taskPickerPath` from blog/wiki for crawl equity). See `practicePath` / `taskPickerPath`.
 */
export type SkillRoute = "speaking" | "reading" | "writing" | "listening";

const SKILL_ROUTES = new Set<SkillRoute>(["speaking", "reading", "writing", "listening"]);

export function isSkillRoute(s: string): s is SkillRoute {
  return SKILL_ROUTES.has(s as SkillRoute);
}

export function categoryToSkillRoute(category: string): SkillRoute {
  const c = category.toLowerCase();
  if (isSkillRoute(c)) return c;
  return "speaking";
}

/** Deep practice session URL (noindex). */
export function practicePath(skill: SkillRoute, practiceId: string, taskId: string): string {
  return `/${skill}/${practiceId}/${taskId}`;
}

/** Task picker / practice list for one task (indexable path). */
export function taskPickerPath(skill: SkillRoute, taskId: string): string {
  return `/${skill}/${encodeURIComponent(taskId)}`;
}
