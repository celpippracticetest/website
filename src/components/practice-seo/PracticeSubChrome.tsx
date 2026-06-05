import type { ReactNode } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { practicePath, taskPickerPath, type SkillRoute } from "@/lib/practiceRoutes";
import { absoluteUrl, buildPracticePageH1 } from "@/lib/practiceSeoCopy";
import type { TPracticeDto } from "@/models/practice.model";
import type { TTaskSchemaDto } from "@/models/tasks.model";
import {
  buildTaskBreadcrumbLabel,
  PRACTICE_OVERVIEW_PATH,
  SKILL_HUB_LABEL,
} from "./practiceBreadcrumbShared";

type PracticeSubChromeProps = {
  skill: SkillRoute;
  task: TTaskSchemaDto;
  practice: TPracticeDto;
  children: ReactNode;
};

export function PracticeSubChrome({
  skill,
  task,
  practice,
  children,
}: PracticeSubChromeProps) {
  const hubPath = `/${skill}`;
  const taskPicker = taskPickerPath(skill, task.id);
  const taskStepLabel = buildTaskBreadcrumbLabel(task);
  const currentUrl = absoluteUrl(practicePath(skill, practice.id, task.id));

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Practice",
        item: absoluteUrl(PRACTICE_OVERVIEW_PATH),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: SKILL_HUB_LABEL[skill],
        item: absoluteUrl(hubPath),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: taskStepLabel,
        item: absoluteUrl(taskPicker),
      },
      {
        "@type": "ListItem",
        position: 4,
        name: practice.title || practice.name,
        item: currentUrl,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <nav
        aria-label="Breadcrumb"
        className="mx-auto w-full max-w-[1280px] px-4 pt-4"
      >
        <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-sm text-[#76808F]">
          <li>
            <Link href={PRACTICE_OVERVIEW_PATH} className="text-inherit">
              Practice
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={hubPath} className="text-inherit">
              {SKILL_HUB_LABEL[skill]}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={taskPicker} className="text-inherit">
              {taskStepLabel}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <span className="font-medium text-[#212E42]" aria-current="page">
              {practice.title || practice.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="mx-auto w-full max-w-[1280px] px-4 pb-0.5 pt-4">
        <h1 className="text-base font-semibold leading-snug text-[#212E42] sm:text-lg">
          {buildPracticePageH1(skill, task, practice)}
        </h1>
      </div>

      {children}
    </>
  );
}
