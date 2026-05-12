import ReadingPractice from "@/components/dashboard-app/reading-practice/ReadingPractice";
import mongoClient from "@/lib/mongodb";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
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
  const taskRepo = new TaskRepository(mongoClient);
  const practiceRepo = new PracticeRepository(mongoClient);
  const task = await taskRepo.findTaskById(taskId);
  const practice = await practiceRepo.findPractice(practiceId);
  if (!task || !practice) {
    return { title: "Reading practice" };
  }
  const title = buildPracticePageTitle("reading", task, practice);
  const description = buildPracticeMetaDescription("reading", task, practice);
  const url = absoluteUrl(practicePath("reading", practiceId, taskId));
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

export default async function ReadingPracticeSubPage({ params }: PageProps) {
  const { practiceId, taskId } = await params;
  const taskRepo = new TaskRepository(mongoClient);
  const task: TTaskSchemaDto | null = await taskRepo.findTaskById(taskId);
  if (!task) {
    redirect("/practice-overview", RedirectType.replace);
  }

  const practiceRepo = new PracticeRepository(mongoClient);
  const practices = await practiceRepo.getAllPractice(
    {
      type: "READING",
      taskId: new ObjectId(taskId) as unknown as string,
    },
    0,
    200
  );
  const selectedPractice = await practiceRepo.findPractice(practiceId);
  if (!selectedPractice) {
    redirect("/practice-overview", RedirectType.replace);
  }

  const hybridUser = await getHybridCurrentUser();
  const user = hybridUser?.user ?? null;
  if (
    !hasPaidPracticeAccess(
      user?.publicMetadata.plan as string | undefined,
      user?.publicMetadata.purchaseDate as string | undefined
    ) &&
    selectedPractice &&
    !selectedPractice.isFree &&
    selectedPractice.passages[0] &&
    selectedPractice.passages[0].body &&
    selectedPractice.passages[0].body.length > 20
  ) {
    selectedPractice.passages[0].body =
      selectedPractice.passages[0].body?.slice(0, 150) +
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
  }

  let answers: TListeningAndReadingAnswerDto | null = null;
  let completedPractice: string[] = [];
  if (user) {
    const listeningAndReadingAnswerRepo = new ListeningAndReadingAnswerRepository(mongoClient);
    answers = await listeningAndReadingAnswerRepo.findAnswerByPracticeAndUser(
      practiceId,
      user.id
    );
    completedPractice = await listeningAndReadingAnswerRepo.findAllTaskIdsByTaskAndUser(
      task.id,
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
        <PracticeSubChrome skill="reading" task={task} practice={selectedPractice}>
          <ReadingPractice
            showHeader={true}
            allPractices={practices.items}
            selectedPractice={selectedPractice}
            task={task}
            previousAnswer={answers}
            completedPractice={completedPractice}
            routePracticeId={practiceId}
            routeTaskId={taskId}
          />
        </PracticeSubChrome>
        {!user && !selectedPractice?.isFree && (
          <Box component="section" sx={{ px: 2, pb: 5 }}>
            <Typography component="h2" sx={{ fontSize: 22, fontWeight: 600, color: "#37465C" }}>
              CELPIP Reading practice strategy
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Build Reading speed by combining skimming for structure with scanning for exact
              details. Focus on keyword matching, paraphrase recognition, and elimination logic.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              To improve scores faster, review wrong answers by task type and repeat targeted drills
              before attempting another full Reading set.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Begin each passage with a quick structure scan: title, headings, and paragraph roles.
              This helps you predict where key evidence is located before you answer questions. When
              time is limited, this structure-first method is more effective than reading every line
              at the same speed.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              For difficult items, avoid guessing based on one familiar word. Compare at least two
              options and confirm which one is fully supported by the text context. This habit
              reduces avoidable errors in inference, viewpoint, and detail-matching questions.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Weekly score gains usually come from better process control: faster scanning, cleaner
              elimination, and disciplined timing. Track these three metrics after every session, and
              you will see clearer improvement trends than only tracking final score.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
