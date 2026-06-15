import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgListeningPart from "@/components/icons/ListeningPart";
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

const LISTENING_PAGE_URL = "https://celpippracticetest.com/listening";
const LISTENING_PAGE_TITLE =
  "CELPIP Practice Exam: Free CELPIP Listening Practice Test";
const LISTENING_PAGE_DESCRIPTION =
  "Free CELPIP practice test and sample test for Listening: authentic audio, timed tasks, and review. Build note-taking, accuracy, and exam-day confidence.";

const listeningStructuredData = buildSkillPageStructuredData({
  pageUrl: LISTENING_PAGE_URL,
  pageTitle: LISTENING_PAGE_TITLE,
  pageDescription: LISTENING_PAGE_DESCRIPTION,
  faqs: skillPagesContent.listening.faqs,
});

const listeningMetadataBase: Metadata = {
  title: LISTENING_PAGE_TITLE,
  description: LISTENING_PAGE_DESCRIPTION,
  keywords: [
    "celpip practice exam",
    "free celpip practice exam",
    "celpip listening practice test",
    "celpip listening test",
    "celpip listening practice",
    "celpip listening sample test",
    "celpip listening samples",
    "celpip listening test practice",
    "celpip listening mock test",
    "celpip mock test listening",
    "celpip general listening test",
    "celpip general listening practice test",
    "celpip listening practice test with answers",
    "celpip listening practice with answers",
    "celpip audio sample",
  ],
  alternates: {
    canonical: LISTENING_PAGE_URL,
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  const { taskId } = await searchParams;
  const hubMeta = await skillHubPageMetadata(
    "listening",
    taskId,
    listeningMetadataBase.title as string,
    listeningMetadataBase.description as string
  );
  return {
    keywords: listeningMetadataBase.keywords,
    ...hubMeta,
  };
}

const DashboardApp = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;

  if (selectedPracticeId && taskId) {
    permanentRedirect(`/listening/${selectedPracticeId}/${taskId}`);
  }
  if (taskId) {
    permanentRedirect(`/listening/${taskId}`);
  }

  const taskRepo = new TaskRepository(documentsClient);
  const tasks = await taskRepo.getAllTask({ type: "practice" }, 0, 100);

  const listeningTasks: PracticeSection[] = [
    {
      tasks: tasks.items
        .filter((taskItem) => taskItem.category === "listening")
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
      route: "listening",
    },
  ];

  const hybridUser = await getHybridCurrentUser();
  const user = hybridUser?.user ?? null;
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = tasks.items
      .filter((taskItem) => taskItem.category === "listening")
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
        <JsonLd data={listeningStructuredData} />
        <SkillLandingPage
          content={skillPagesContent.listening}
          skillType="listening"
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
            bgcolor: "#E3ECFF",
          }}
        >
          <Box sx={{ color: "#316BFF", display: "flex", alignItems: "center" }}>
            <SvgListeningPart />
          </Box>
          <Typography component="h1" sx={{ color: "#37465C", fontWeight: 600, fontSize: 20 }}>
            Listening Practice
          </Typography>
        </Box>
        <ShowTasks tasks={listeningTasks} />
      </ShowTaskHeader>
    );
  }

  redirect("/practice-overview", RedirectType.replace);
};

export default DashboardApp;
