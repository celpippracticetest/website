import type { ReactNode } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { practicePath, taskPickerPath, type SkillRoute } from "@/lib/practiceRoutes";
import { absoluteUrl, buildPracticePageH1 } from "@/lib/practiceSeoCopy";
import type { TPracticeDto } from "@/models/practice.model";
import type { TTaskSchemaDto } from "@/models/tasks.model";
import { Box, Typography } from "@mui/material";

const SKILL_HUB_LABEL: Record<SkillRoute, string> = {
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  listening: "Listening",
};

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
  const taskStepLabel = `Task ${task.taskNumber.replace(/\D/g, "") || task.taskNumber} – ${task.name}`;
  const currentUrl = absoluteUrl(practicePath(skill, practice.id, task.id));

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
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
      <Box
        component="nav"
        aria-label="Breadcrumb"
        sx={{ px: 2, pt: 2, maxWidth: 1280, mx: "auto", width: 1 }}
      >
        <Typography
          component="ol"
          sx={{
            m: 0,
            p: 0,
            listStyle: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: 0.5,
            alignItems: "center",
            fontSize: 14,
            color: "#76808F",
          }}
        >
          <li>
            <Link href="/" style={{ color: "inherit" }}>
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={hubPath} style={{ color: "inherit" }}>
              {SKILL_HUB_LABEL[skill]}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={taskPicker} style={{ color: "inherit" }}>
              {taskStepLabel}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Typography
              component="span"
              color="#212E42"
              sx={{ fontWeight: 500 }}
              aria-current="page"
            >
              {practice.title || practice.name}
            </Typography>
          </li>
        </Typography>
      </Box>

      <Box sx={{ px: 2, pt: 2, pb: 0.5, maxWidth: 1280, mx: "auto", width: 1 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 16, sm: 18 },
            fontWeight: 600,
            color: "#212E42",
            lineHeight: 1.35,
          }}
        >
          {buildPracticePageH1(skill, task, practice)}
        </Typography>
      </Box>

      {children}
    </>
  );
}
