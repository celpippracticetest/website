import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgWritingPart from "@/components/icons/WritingPart";
import documentsClient from "@/lib/appDocumentsClient";
import { TaskRepository } from "@/repositories/tasks.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { permanentRedirect, redirect, RedirectType } from "next/navigation";
import SkillLandingPage from "@/components/skill-landing/SkillLandingPage";
import { skillPagesContent } from "@/data/skill-pages-content";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildSkillPageStructuredData } from "@/lib/seo/siteSchema";
import type { Metadata } from "next";
import { Box, Typography } from "@mui/material";
import { skillHubPageMetadata } from "@/lib/skillHubPageMetadata";
interface PracticeSection {
  tasks: {
    id: string;
    category: string;
    taskNumber: string;
    name: string;
  }[];
  route: string;
}

const WRITING_PAGE_URL = "https://celpippracticetest.com/writing";
const WRITING_PAGE_TITLE =
  "CELPIP Practice Exam: Free CELPIP Writing Practice Test";
const WRITING_PAGE_DESCRIPTION =
  "CELPIP practice exam for Writing: realistic email and survey tasks, instant AI feedback, and model answers. Improve grammar, coherence, and task response.";

const writingStructuredData = buildSkillPageStructuredData({
  pageUrl: WRITING_PAGE_URL,
  pageTitle: WRITING_PAGE_TITLE,
  pageDescription: WRITING_PAGE_DESCRIPTION,
  aiAnswer: skillPagesContent.writing.aiAnswer,
  tasks: skillPagesContent.writing.tasks,
  faqs: skillPagesContent.writing.faqs,
});

const writingMetadataBase: Metadata = {
  title: WRITING_PAGE_TITLE,
  description: WRITING_PAGE_DESCRIPTION,
  keywords: [
    "celpip practice exam",
    "free celpip practice exam",
    "celpip writing practice test",
    "celpip sample writing test",
    "celpip writing practice",
    "celpip writing test",
    "celpip writing samples",
    "celpip general writing",
    "celpip general writing test",
    "celpip mock test writing",
    "celpip practice test writing",
    "celpip practice writing test",
    "celpip general writing sample answers",
  ],
  alternates: {
    canonical: WRITING_PAGE_URL,
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  const { taskId } = await searchParams;
  const hubMeta = await skillHubPageMetadata(
    "writing",
    taskId,
    writingMetadataBase.title as string,
    writingMetadataBase.description as string
  );
  return {
    keywords: writingMetadataBase.keywords,
    ...hubMeta,
  };
}

const WritingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;

  if (selectedPracticeId && taskId) {
    permanentRedirect(`/writing/${selectedPracticeId}/${taskId}`);
  }
  if (taskId) {
    permanentRedirect(`/writing/${taskId}`);
  }

  const taskRepo = new TaskRepository(documentsClient);
  const tasks = await taskRepo.getAllTask({ type: "practice" }, 0, 100);

  const writingTasks: PracticeSection[] = [
    {
      tasks: tasks.items
        .filter((taskItem) => taskItem.category === "writing")
        .sort((a, b) => {
          const numA = parseInt(a.taskNumber.replace(/\D/g, ""));
          const numB = parseInt(b.taskNumber.replace(/\D/g, ""));
          return numA - numB;
        })
        .map((taskItem) => ({
          id: taskItem.id,
          category: taskItem.category,
          taskNumber: taskItem.taskNumber,
          name: taskItem.name,
        })),
      route: "writing",
    },
  ];

  const hybridUser = await getHybridCurrentUser();
  const user = hybridUser?.user ?? null;
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = tasks.items
      .filter((taskItem) => taskItem.category === "writing")
      .sort((a, b) => {
        const numA = parseInt(a.taskNumber.replace(/\D/g, ""));
        const numB = parseInt(b.taskNumber.replace(/\D/g, ""));
        return numA - numB;
      })
      .map((taskItem) => ({
        id: taskItem.id,
        taskNumber: taskItem.taskNumber,
      }));

    return (
      <>
        <JsonLd data={writingStructuredData} />
        <SkillLandingPage
          content={skillPagesContent.writing}
          skillType="writing"
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
            bgcolor: "#D5F5F0",
          }}
        >
          <Box sx={{ color: "#0DAA94", display: "flex", alignItems: "center" }}>
            <SvgWritingPart />
          </Box>
          <Typography component="h1" sx={{ color: "#37465C", fontWeight: 600, fontSize: 20 }}>
            Writing Practice
          </Typography>
        </Box>
        <ShowTasks tasks={writingTasks} />
      </ShowTaskHeader>
    );
  }

  redirect("/practice-overview", RedirectType.replace);
};

export default WritingPage;
