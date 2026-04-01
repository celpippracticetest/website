import type { Metadata } from "next";
import mongoClient from "@/lib/mongodb";
import { TaskRepository } from "@/repositories/tasks.repo";
import type { SkillRoute } from "@/lib/practiceRoutes";

function siteRoot(): string {
  return (process.env.APP_BASE_URL || "https://celpippracticetest.com").replace(
    /\/?$/,
    ""
  );
}

const SKILL_LABEL: Record<SkillRoute, string> = {
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  listening: "Listening",
};

/**
 * Indexable hub + task-picker metadata: self-referencing canonical (includes ?taskId when set)
 * and task-specific title/description for CTR when a task is selected.
 */
export async function skillHubPageMetadata(
  skill: SkillRoute,
  taskId: string | undefined,
  fallbackTitle: string,
  fallbackDescription: string,
  extra?: { openGraph?: Metadata["openGraph"] }
): Promise<Metadata> {
  const root = siteRoot();
  const hubPath = `/${skill}`;
  let canonical = `${root}${hubPath}`;
  let title = fallbackTitle;
  let description = fallbackDescription;

  if (taskId) {
    canonical = `${root}${hubPath}?taskId=${encodeURIComponent(taskId)}`;
    const taskRepo = new TaskRepository(mongoClient);
    const task = await taskRepo.findTaskById(taskId);
    if (task && task.category === skill) {
      const n = task.taskNumber.replace(/\D/g, "") || task.taskNumber;
      title = `${task.name.trim()} – CELPIP ${SKILL_LABEL[skill]} Task ${n} | Pick a practice`;
      description = `Choose a timed CELPIP ${SKILL_LABEL[skill]} practice for ${task.name.trim()}. Realistic format and instant feedback.`;
    }
  }

  const ogBase =
    extra?.openGraph && typeof extra.openGraph === "object"
      ? extra.openGraph
      : {};

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      ...ogBase,
      url: canonical,
      title,
      description,
      siteName: "CELPIPPRACTICETEST",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}
