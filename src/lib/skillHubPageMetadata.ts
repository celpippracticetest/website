import type { Metadata } from "next";
import documentsClient from "@/lib/appDocumentsClient";
import { TaskRepository } from "@/repositories/tasks.repo";
import type { SkillRoute } from "@/lib/practiceRoutes";
import { getIndexingRobotsDirective, NOINDEX_ROBOTS } from "@/lib/searchIndexing";

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
 * Hub + task-picker metadata. Deep practice sessions (`/skill/:practiceId/:taskId`)
 * are always noindex; hubs stay indexable (except preview/staging).
 */
export async function skillHubPageMetadata(
  skill: SkillRoute,
  taskId: string | undefined,
  fallbackTitle: string,
  fallbackDescription: string,
  extra?: {
    openGraph?: Metadata["openGraph"];
    keywords?: string[];
    /** Deep practice session (`/skill/:practiceId/:taskId`) must stay noindex. */
    selectedPracticeId?: string;
  }
): Promise<Metadata> {
  const root = siteRoot();
  const hubPath = `/${skill}`;
  const isPracticeSession = Boolean(extra?.selectedPracticeId);
  let canonical = `${root}${hubPath}`;
  let title = fallbackTitle;
  let description = fallbackDescription;

  if (!isPracticeSession && taskId) {
    canonical = `${root}${hubPath}?taskId=${encodeURIComponent(taskId)}`;
    const taskRepo = new TaskRepository(documentsClient);
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
    ...(extra?.keywords?.length ? { keywords: extra.keywords } : {}),
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
    robots: isPracticeSession
      ? NOINDEX_ROBOTS
      : getIndexingRobotsDirective(process.env.APP_BASE_URL),
  };
}
