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
import { cache } from "react";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { Box, Typography } from "@mui/material";
import { PracticeSubChrome } from "@/components/practice-seo/PracticeSubChrome";
import {
  absoluteUrl,
  buildPracticeMetaDescription,
  buildPracticePageTitle,
} from "@/lib/practiceSeoCopy";
import { practicePath } from "@/lib/practiceRoutes";
import { captureException } from "@/lib/sentry-logger";

/** Strip non-JSON values before passing Mongo/Supabase DTOs into client components. */
function serializeForClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type PageProps = {
  params: Promise<{ practiceId: string; taskId: string }>;
};

const loadSpeakingTaskAndPractice = cache(
  async (practiceId: string, taskId: string) => {
    const taskRepo = new TaskRepository(documentsClient);
    const practiceRepo = new PracticeRepository(documentsClient);
    const [task, practice] = await Promise.all([
      taskRepo.findTaskById(taskId),
      practiceRepo.findPractice(practiceId),
    ]);
    return { task, practice };
  }
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { practiceId, taskId } = await params;
  const { task, practice } = await loadSpeakingTaskAndPractice(practiceId, taskId);
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
  const practiceRepo = new PracticeRepository(documentsClient);

  const [{ task, practice: selectedPractice }, practices, hybridUser] =
    await Promise.all([
    loadSpeakingTaskAndPractice(practiceId, taskId),
    practiceRepo.getPracticeNavList(
      {
        type: "SPEAKING",
        taskId: new ObjectId(taskId) as unknown as string,
      },
      0,
      200
    ),
    getHybridCurrentUser(),
  ]);

  if (!task) {
    redirect("/practice-overview", RedirectType.replace);
  }
  if (!selectedPractice) {
    redirect("/practice-overview", RedirectType.replace);
  }
  const user = hybridUser?.user ?? null;
  const firstPassage = selectedPractice.passages?.[0];
  if (
    firstPassage &&
    !hasPaidPracticeAccess(
      user?.publicMetadata.plan as string | undefined,
      user?.publicMetadata.purchaseDate as string | undefined
    ) &&
    !selectedPractice.isFree
  ) {
    firstPassage.body =
      firstPassage.body?.slice(0, 150) +
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
    firstPassage.sampleResponse = firstPassage.sampleResponse?.map((item) => ({
      ...item,
      body:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    }));
  }

  let completedPracticeId: string[] = [];
  let initialSpeakingAnswers: Awaited<
    ReturnType<WritingAndSpeakingAnswerRepository["getAllWritingAnswers"]>
  >["items"] = [];
  const initialAuth = user
    ? {
        isSignedIn: true as const,
        plan: (user.publicMetadata.plan as string | undefined) ?? "free",
        purchaseDate: user.publicMetadata.purchaseDate as string | undefined,
      }
    : { isSignedIn: false as const, plan: "free" as const };

  if (user) {
    try {
      const writingAnswerRepo = new WritingAndSpeakingAnswerRepository(documentsClient);
      const [completed, answersPage] = await Promise.all([
        writingAnswerRepo.findCompletedPracticeIdsByTaskAndUser(
          taskId,
          user.id,
          "SPEAKING"
        ),
        writingAnswerRepo.getAllWritingAnswers(
          { userId: user.id, practiceId, type: "SPEAKING" },
          0,
          30
        ),
      ]);
      completedPracticeId = completed;
      initialSpeakingAnswers = answersPage.items;
    } catch (err) {
      captureException(err, {
        component: "SpeakingPracticeSubPage",
        action: "load_user_answers",
        metadata: { practiceId, taskId, userId: user.id },
      });
    }
  }

  const clientPractice = serializeForClient(selectedPractice);
  const clientTask = serializeForClient(task);
  const clientPractices = serializeForClient(practices.items);
  const clientInitialAnswers = serializeForClient(initialSpeakingAnswers);

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
        <PracticeSubChrome skill="speaking" task={clientTask} practice={clientPractice}>
          <SpeakingPractice
            showHeader={true}
            allPractices={clientPractices}
            selectedPractice={clientPractice}
            task={clientTask}
            completedPracticeId={completedPracticeId}
            initialSpeakingAnswers={clientInitialAnswers}
            initialAuth={initialAuth}
            routePracticeId={practiceId}
            routeTaskId={taskId}
          />
        </PracticeSubChrome>
        {!user && selectedPractice && !selectedPractice.isFree && (
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
