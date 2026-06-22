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

const PRACTICE_DEEP_LINK_PATH =
  /^\/(listening|reading|speaking|writing)\/([^/]+)\/([^/]+)$/;

/** Resolve practice + task ids from query params or `/skill/:practiceId/:taskId` path. */
export function parsePracticeDeepLink(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">,
): { selectedPracticeId: string | null; taskId: string | null } {
  const selectedPracticeId = searchParams.get("selectedPracticeId");
  const taskId = searchParams.get("taskId");
  if (selectedPracticeId && taskId) {
    return { selectedPracticeId, taskId };
  }

  const match = pathname.match(PRACTICE_DEEP_LINK_PATH);
  if (!match) {
    return { selectedPracticeId, taskId };
  }

  return {
    selectedPracticeId: selectedPracticeId ?? match[2],
    taskId: taskId ?? match[3],
  };
}

/** Task picker / practice list for one task (indexable query). */
export function taskPickerPath(skill: SkillRoute, taskId: string): string {
  return `/${skill}?taskId=${encodeURIComponent(taskId)}`;
}
