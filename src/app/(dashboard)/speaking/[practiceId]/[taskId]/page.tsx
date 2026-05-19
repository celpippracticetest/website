import SpeakingPractice from "@/components/dashboard-app/speaking-practice/SpeakingPractice";
import documentsClient from "@/lib/appDocumentsClient";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { ObjectId } from "bson";
import { redirect, RedirectType } from "next/navigation";
import type { Metadata } from "next";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { Box, Typography } from "@mui/material";
import { PracticeSubChrome } from "@/components/practice-seo/PracticeSubChrome";
import {
  absoluteUrl,
  buildPracticeMetaDescription,
  buildPracticePageTitle,
} from "@/lib/practiceSeoCopy";
import { practicePath } from "@/lib/practiceRoutes";

type PageProps = {
  params: Promise<{ practiceId: string; taskId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { practiceId, taskId } = await params;
  const taskRepo = new TaskRepository(documentsClient);
  const practiceRepo = new PracticeRepository(documentsClient);
  const task = await taskRepo.findTaskById(taskId);
  const practice = await practiceRepo.findPractice(practiceId);
  if (!task || !practice) {
    return { title: "Speaking practice" };
  }
  const title = buildPracticePageTitle("speaking", task, practice);
  const description = buildPracticeMetaDescription("speaking", task, practice);
  const url = absoluteUrl(practicePath("speaking", practiceId, taskId));
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "CELPIPPRACTICETEST",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SpeakingPracticeSubPage({ params }: PageProps) {
  const { practiceId, taskId } = await params;
  const taskRepo = new TaskRepository(documentsClient);
  const practiceRepo = new PracticeRepository(documentsClient);

  const [task, practices, selectedPractice, hybridUser] = await Promise.all([
    taskRepo.findTaskById(taskId),
    practiceRepo.getAllPractice(
      {
        type: "SPEAKING",
        taskId: new ObjectId(taskId) as unknown as string,
      },
      0,
      200
    ),
    practiceRepo.findPractice(practiceId),
    getHybridCurrentUser(),
  ]);

  if (!task) {
    redirect("/practice-overview", RedirectType.replace);
  }
  if (!selectedPractice) {
    redirect("/practice-overview", RedirectType.replace);
  }
  const user = hybridUser?.user ?? null;
  if (
    !hasPaidPracticeAccess(
      user?.publicMetadata.plan as string | undefined,
      user?.publicMetadata.purchaseDate as string | undefined
    ) &&
    !selectedPractice.isFree
  ) {
    selectedPractice.passages[0].body =
      selectedPractice.passages[0].body?.slice(0, 150) +
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
    selectedPractice.passages[0].sampleResponse =
      selectedPractice.passages[0].sampleResponse?.map((item) => {
        item.body =
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
        return item;
      });
  }

  let completedPracticeId: string[] = [];
  if (user) {
    const writingAnswerRepo = new WritingAndSpeakingAnswerRepository(documentsClient);
    completedPracticeId = await writingAnswerRepo.findAnswersByPracticeIdsAndUser(
      practices.items.map((p) => p.id),
      user.id
    );
  }

  const strategyBodySx = {
    mt: 2,
    fontSize: 15,
    lineHeight: "24px",
    color: "#526071",
  };

  return (
    <Box
      component="main"
      sx={{
        bgcolor: "#F2F6FF",
        minHeight: "100vh",
        display: "flex",
        width: 1,
        justifyContent: "center",
      }}
    >
      <Box sx={{ width: 1, maxWidth: 1280 }}>
        <PracticeSubChrome skill="speaking" task={task} practice={selectedPractice}>
          <SpeakingPractice
            showHeader={true}
            allPractices={practices.items}
            selectedPractice={selectedPractice}
            task={task}
            completedPracticeId={completedPracticeId}
            routePracticeId={practiceId}
            routeTaskId={taskId}
          />
        </PracticeSubChrome>
        {!user && !selectedPractice?.isFree && (
          <Box component="section" sx={{ px: 2, pb: 5 }}>
            <Typography component="h2" sx={{ fontSize: 22, fontWeight: 600, color: "#37465C" }}>
              CELPIP Speaking practice strategy
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Improve Speaking scores by using clear structure, natural pacing, and relevant
              supporting details for each task prompt.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Practice with a timer, then review pronunciation clarity, grammar control, and idea
              development to make targeted improvements before the next response.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Start each answer with a simple framework: opening point, supporting detail, and brief
              conclusion. This structure helps you avoid long pauses and keeps your response focused
              even when the prompt topic feels unfamiliar.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Record practice responses and listen critically. Note where your ideas lose clarity,
              where grammar breaks under pressure, and where pronunciation affects understanding. Fix
              one pattern at a time, then re-record the same prompt to confirm improvement.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              The goal is not perfect accent. The goal is clear communication with stable pacing and
              relevant content. Consistent practice with timed tasks builds the confidence needed to
              deliver complete, coherent answers on exam day.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
