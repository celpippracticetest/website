import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
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

const SPEAKING_PAGE_URL = "https://celpippracticetest.com/speaking";
const SPEAKING_PAGE_TITLE =
  "CELPIP Practice Exam: Free CELPIP Speaking Practice Test";
const SPEAKING_PAGE_DESCRIPTION =
  "CELPIP practice exam for Speaking: timed prompts, AI scoring, and tips for fluency. Train under realistic conditions before your real test.";

const speakingStructuredData = buildSkillPageStructuredData({
  pageUrl: SPEAKING_PAGE_URL,
  pageTitle: SPEAKING_PAGE_TITLE,
  pageDescription: SPEAKING_PAGE_DESCRIPTION,
  aiAnswer: skillPagesContent.speaking.aiAnswer,
  tasks: skillPagesContent.speaking.tasks,
  faqs: skillPagesContent.speaking.faqs,
});

const speakingMetadataBase: Metadata = {
  title: SPEAKING_PAGE_TITLE,
  description: SPEAKING_PAGE_DESCRIPTION,
  keywords: [
    "celpip practice exam",
    "free celpip practice exam",
    "celpip speaking practice test",
    "celpip speaking test",
    "celpip speaking practice",
    "celpip practice test speaking",
    "celpip sample speaking questions",
    "celpip practice speaking test",
    "celpip general speaking sample test",
  ],
  alternates: {
    canonical: SPEAKING_PAGE_URL,
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  const { taskId } = await searchParams;
  const hubMeta = await skillHubPageMetadata(
    "speaking",
    taskId,
    speakingMetadataBase.title as string,
    speakingMetadataBase.description as string
  );
  return {
    keywords: speakingMetadataBase.keywords,
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
const SpeakingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;

  if (selectedPracticeId && taskId) {
    permanentRedirect(`/speaking/${selectedPracticeId}/${taskId}`);
  }
  if (taskId) {
    permanentRedirect(`/speaking/${taskId}`);
  }

  const taskRepo = new TaskRepository(documentsClient);
  const tasks = await taskRepo.getAllTask({ type: "practice" }, 0, 100);

  const speakingTasks: PracticeSection[] = [
    {
      tasks: tasks.items
        .filter((taskItem) => taskItem.category === "speaking")
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
      route: "speaking",
    },
  ];

  const hybridUser = await getHybridCurrentUser();
  const user = hybridUser?.user ?? null;
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = tasks.items
      .filter((taskItem) => taskItem.category === "speaking")
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
        <JsonLd data={speakingStructuredData} />
        <SkillLandingPage
          content={skillPagesContent.speaking}
          skillType="speaking"
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
            <SvgSpeakingPart />
          </Box>
          <Typography component="h1" sx={{ color: "#37465C", fontWeight: 600, fontSize: 20 }}>
            Speaking Practice
          </Typography>
        </Box>
        <ShowTasks tasks={speakingTasks} />
      </ShowTaskHeader>
    );
  }

  redirect("/practice-overview", RedirectType.replace);
};

export default SpeakingPage;
