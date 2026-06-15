import ShowTasks from "@/components/dashboard-new/ShowTasks/ShowTasksLazy";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/ShowTaskHeaderLazy";
import SvgReadingPart from "@/components/icons/ReadingPart";
import documentsClient from "@/lib/appDocumentsClient";
import { TaskRepository } from "@/repositories/tasks.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { permanentRedirect, redirect, RedirectType } from "next/navigation";
import SkillLandingPage from "@/components/skill-landing/SkillLandingPage";
import { skillPagesContent } from "@/data/skill-pages-content";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildSkillPageStructuredData } from "@/lib/seo/siteSchema";
import type { Metadata } from "next";
import { skillHubPageMetadata } from "@/lib/skillHubPageMetadata";
import { Box, Typography } from "@mui/material";

const READING_PAGE_URL = "https://celpippracticetest.com/reading";
const READING_PAGE_TITLE =
  "CELPIP Practice Exam: Free CELPIP Reading Practice Test";
const READING_PAGE_DESCRIPTION =
  "Practice the CELPIP Reading test with timed tasks, answer explanations, and realistic question types. Train correspondence, diagram, information, and viewpoints skills with a free CELPIP practice exam.";

const readingMetadataBase: Metadata = {
  title: READING_PAGE_TITLE,
  description: READING_PAGE_DESCRIPTION,
  keywords: [
    "celpip practice exam",
    "free celpip practice exam",
    "celpip reading practice test",
    "celpip reading test",
    "celpip reading exam",
    "celpip reading questions",
    "celpip reading mock test",
    "celpip reading sample test",
    "celpip reading sample",
    "celpip reading test sample",
    "celpip general reading",
    "celpip general reading test",
  ],
  alternates: {
    canonical: READING_PAGE_URL,
  },
  openGraph: {
    title: READING_PAGE_TITLE,
    description: READING_PAGE_DESCRIPTION,
    url: READING_PAGE_URL,
    siteName: "CELPIPPRACTICETEST",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: READING_PAGE_TITLE,
    description: READING_PAGE_DESCRIPTION,
  },
};

const readingStructuredData = buildSkillPageStructuredData({
  pageUrl: READING_PAGE_URL,
  pageTitle: READING_PAGE_TITLE,
  pageDescription: READING_PAGE_DESCRIPTION,
  faqs: skillPagesContent.reading.faqs,
});

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  const { taskId } = await searchParams;
  const hubMeta = await skillHubPageMetadata(
    "reading",
    taskId,
    READING_PAGE_TITLE,
    READING_PAGE_DESCRIPTION,
    { openGraph: readingMetadataBase.openGraph }
  );
  return {
    keywords: readingMetadataBase.keywords,
    ...hubMeta,
  };
}

interface PracticeSection {
  tasks: {
    id: string;
    category: string;
    taskNumber: string;
    name: string;
  }[];
  route: string;
}

function sortReadingTasks<T extends { taskNumber: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const numA = parseInt(a.taskNumber.replace(/\D/g, ""), 10);
    const numB = parseInt(b.taskNumber.replace(/\D/g, ""), 10);
    return numA - numB;
  });
}

function toReadingTaskRows(
  items: {
    id: string;
    category: string;
    taskNumber: string;
    name: string;
  }[]
) {
  return sortReadingTasks(items).map((taskItem) => ({
    id: taskItem.id,
    category: taskItem.category,
    taskNumber: taskItem.taskNumber,
    name: taskItem.name,
  }));
}

const ReadingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;

  if (selectedPracticeId && taskId) {
    permanentRedirect(`/reading/${selectedPracticeId}/${taskId}`);
  }
  if (taskId) {
    permanentRedirect(`/reading/${taskId}`);
  }

  const taskRepo = new TaskRepository(documentsClient);
  const [tasks, hybridUser] = await Promise.all([
    taskRepo.getAllTask({ type: "practice", category: "reading" }, 0, 100),
    getHybridCurrentUser(),
  ]);

  const readingTaskItems = toReadingTaskRows(tasks.items);
  const readingTasks: PracticeSection[] = [
    {
      tasks: readingTaskItems,
      route: "reading",
    },
  ];

  const user = hybridUser?.user ?? null;
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = readingTaskItems.map((taskItem) => ({
      id: taskItem.id,
      taskNumber: taskItem.taskNumber,
    }));

    return (
      <>
        <JsonLd data={readingStructuredData} />
        <SkillLandingPage
          content={skillPagesContent.reading}
          skillType="reading"
          availableTasks={availableTasks}
        />
      </>
    );
  }

  if (!selectedPracticeId && !taskId) {
    return (
      <ShowTaskHeader>
        <Box
          sx={{
            display: "flex",
            mt: { xs: 4, sm: 0 },
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            maxWidth: 1200,
            width: 1,
            height: 60,
            flexShrink: 0,
            borderRadius: 1.5,
            bgcolor: "#FFEBD6",
          }}
        >
          <Box sx={{ color: "#F27059", display: "flex", alignItems: "center" }}>
            <SvgReadingPart />
          </Box>
          <Typography component="h1" sx={{ color: "#37465C", fontWeight: 600, fontSize: 20 }}>
            CELPIP Reading Practice Test
          </Typography>
        </Box>
        <ShowTasks tasks={readingTasks} />
      </ShowTaskHeader>
    );
  }

  redirect("/practice-overview", RedirectType.replace);
};

export default ReadingPage;
