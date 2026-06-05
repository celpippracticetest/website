"use client";

import Link from "next/link";
import type { SkillRoute } from "@/lib/practiceRoutes";
import { taskPickerPath } from "@/lib/practiceRoutes";
import type { TTaskSchemaDto } from "@/models/tasks.model";
import {
  buildTaskBreadcrumbLabel,
  PRACTICE_OVERVIEW_PATH,
  SKILL_HUB_LABEL,
} from "./practiceBreadcrumbShared";

type PracticeBreadcrumbNavProps = {
  skill: SkillRoute;
  task: TTaskSchemaDto;
  /** When set, shows 4-level trail ending with this practice name (current page). */
  practiceName?: string;
};

export function PracticeBreadcrumbNav({
  skill,
  task,
  practiceName,
}: PracticeBreadcrumbNavProps) {
  const hubPath = `/${skill}`;
  const taskStepLabel = buildTaskBreadcrumbLabel(task);

  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto w-full max-w-[1280px] px-4 pt-4"
    >
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-sm text-[#76808F]">
        <li>
          <Link href={PRACTICE_OVERVIEW_PATH} className="text-inherit hover:text-[#212E42]">
            Practice
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link href={hubPath} className="text-inherit hover:text-[#212E42]">
            {SKILL_HUB_LABEL[skill]}
          </Link>
        </li>
        <li aria-hidden>/</li>
        {practiceName ? (
          <>
            <li>
              <Link
                href={taskPickerPath(skill, task.id)}
                className="text-inherit hover:text-[#212E42]"
              >
                {taskStepLabel}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <span className="font-medium text-[#212E42]" aria-current="page">
                {practiceName}
              </span>
            </li>
          </>
        ) : (
          <li>
            <span className="font-medium text-[#212E42]" aria-current="page">
              {taskStepLabel}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
