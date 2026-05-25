import {
  categoryToSkillRoute,
  practicePath,
  taskPickerPath,
  type SkillRoute,
} from "@/lib/practiceRoutes";

type PracticeRouter = { push: (href: string) => void };

/** Visit task picker first so browser Back from a session returns to a real route. */
export function navigateToPracticeSession(
  router: PracticeRouter,
  skill: SkillRoute,
  practiceId: string,
  taskId: string,
): void {
  const picker = taskPickerPath(skill, taskId);
  const session = practicePath(skill, practiceId, taskId);
  router.push(picker);
  queueMicrotask(() => router.push(session));
}

export function navigateToPracticeSessionFromCategory(
  router: PracticeRouter,
  category: string,
  practiceId: string,
  taskId: string,
): void {
  navigateToPracticeSession(
    router,
    categoryToSkillRoute(category),
    practiceId,
    taskId,
  );
}
