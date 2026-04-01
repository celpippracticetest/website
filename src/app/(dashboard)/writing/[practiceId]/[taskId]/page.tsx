import WritingPractice from "@/components/dashboard-app/writing-practice/WritingPractice";
import mongoClient from "@/lib/mongodb";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { currentUser } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
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
  const taskRepo = new TaskRepository(mongoClient);
  const practiceRepo = new PracticeRepository(mongoClient);
  const task = await taskRepo.findTaskById(taskId);
  const practice = await practiceRepo.findPractice(practiceId);
  if (!task || !practice) {
    return { title: "Writing practice" };
  }
  const title = buildPracticePageTitle("writing", task, practice);
  const description = buildPracticeMetaDescription("writing", task, practice);
  const url = absoluteUrl(practicePath("writing", practiceId, taskId));
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

export default async function WritingPracticeSubPage({ params }: PageProps) {
  const { practiceId, taskId } = await params;
  const taskRepo = new TaskRepository(mongoClient);
  const task: TTaskSchemaDto | null = await taskRepo.findTaskById(taskId);
  if (!task) {
    redirect("/practice-overview", RedirectType.replace);
  }

  const practiceRepo = new PracticeRepository(mongoClient);
  const practices = await practiceRepo.getAllPractice(
    {
      type: "WRITING",
      taskId: new ObjectId(taskId) as unknown as string,
    },
    0,
    200
  );
  const selectedPractice = await practiceRepo.findPractice(practiceId);
  if (!selectedPractice) {
    redirect("/practice-overview", RedirectType.replace);
  }

  const user = await currentUser();
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
    const writingAnswerRepo = new WritingAndSpeakingAnswerRepository(mongoClient);
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
        <PracticeSubChrome skill="writing" task={task} practice={selectedPractice}>
          <WritingPractice
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
              CELPIP Writing practice strategy
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Raise Writing performance by organizing each response with a clear purpose, logical
              paragraph flow, and accurate grammar under exam timing.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              After each task, review coherence, task response, vocabulary variety, and sentence
              control to identify one priority fix for your next attempt.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              A reliable method is to plan before you write. Spend one to two minutes defining your
              purpose, main points, and tone. This short planning step prevents off-topic responses
              and improves organization, which is critical for higher band scoring in CELPIP tasks.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              During revision, prioritize high-impact edits: sentence clarity, verb tense
              consistency, and linking phrases that improve flow. You do not need advanced language
              in every sentence. You need clear, correct, and relevant communication from start to
              finish.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Build confidence by comparing older and newer responses side by side. When you can see
              stronger structure and fewer repeated errors over time, your writing process becomes
              faster and more stable under exam timing.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
