import ListeningPractice from "@/components/dashboard-app/listening-practice/ListeningPractice";
import mongoClient from "@/lib/mongodb";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { currentUser } from "@clerk/nextjs/server";
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
    return { title: "Listening practice" };
  }
  const title = buildPracticePageTitle("listening", task, practice);
  const description = buildPracticeMetaDescription("listening", task, practice);
  const url = absoluteUrl(practicePath("listening", practiceId, taskId));
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

export default async function ListeningPracticeSubPage({ params }: PageProps) {
  const { practiceId, taskId } = await params;
  const taskRepo = new TaskRepository(mongoClient);
  const task: TTaskSchemaDto | null = await taskRepo.findTaskById(taskId);
  if (!task) {
    redirect("/practice-overview", RedirectType.replace);
  }

  const practiceRepo = new PracticeRepository(mongoClient);
  const practices = await practiceRepo.getAllPractice(
    {
      type: "LISTENING",
      taskId: new ObjectId(taskId) as unknown as string,
    },
    0,
    200
  );
  let selectedPractice = await practiceRepo.findPractice(practiceId);
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
    selectedPractice = {
      ...selectedPractice,
      passages: [],
    };
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
        <PracticeSubChrome skill="listening" task={task} practice={selectedPractice}>
          <ListeningPractice
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
              CELPIP Listening practice strategy
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Improve Listening by training note-taking, identifying key details, and tracking
              distractors such as similar numbers, dates, or paraphrased options.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Review every missed item by question type, then repeat a similar task under timed
              conditions to build accuracy and consistency for the real CELPIP test.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              A high-scoring routine uses short, repeatable cycles. First, complete one listening set
              without pausing. Second, review only your incorrect answers and identify exactly why
              each distractor looked correct. Third, replay critical moments and practice capturing
              keywords in fewer words. This improves both speed and attention.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              Focus especially on transitions, speaker intent, and paraphrased details. Many losses
              happen when learners search for exact words instead of meaning. Building this
              paraphrase recognition skill makes your performance more stable across different
              topics and accents.
            </Typography>
            <Typography component="p" sx={strategyBodySx}>
              In the final preparation phase, simulate real test pressure by practicing with strict
              timing and no interruptions. Then compare results across several attempts to confirm
              that your accuracy stays consistent. Consistency, not one perfect attempt, is the best
              predictor of exam-day listening success.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
