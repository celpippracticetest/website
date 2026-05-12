import ListeningPractice from "@/components/dashboard-app/listening-practice/ListeningPractice";
import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgListeningPart from "@/components/icons/ListeningPart";
import mongoClient from "@/lib/mongodb";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { ObjectId } from "bson";
import { permanentRedirect, redirect, RedirectType } from "next/navigation";
import SkillLandingPage from "@/components/skill-landing/SkillLandingPage";
import { skillPagesContent } from "@/data/skill-pages-content";
import type { Metadata } from "next";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
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

const listeningMetadataBase: Metadata = {
  title: "CELPIP Practice Exam: Free CELPIP Listening Practice Test",
  description:
    "Free CELPIP practice test and sample test for Listening: authentic audio, timed tasks, and review. Build note-taking, accuracy, and exam-day confidence.",
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
    canonical: "https://celpippracticetest.com/listening",
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
  const taskRepo = new TaskRepository(mongoClient);
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

    return <SkillLandingPage content={skillPagesContent.listening} skillType="listening" availableTasks={availableTasks} />;
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

  if (selectedPracticeId && taskId) {
    permanentRedirect(`/listening/${selectedPracticeId}/${taskId}`);
  }
  if (selectedPracticeId && !taskId) {
    redirect("/practice-overview", RedirectType.replace);
  }
  if (!taskId) {
    redirect("/practice-overview", RedirectType.replace);
  }

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
  let selectedPractice = null;
  if (selectedPracticeId) {
    selectedPractice = await practiceRepo.findPractice(selectedPracticeId);
  }

  if (
    !hasPaidPracticeAccess(
      user?.publicMetadata.plan as string | undefined,
      user?.publicMetadata.purchaseDate as string | undefined
    ) &&
    selectedPractice &&
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
    const listeningAndReadingAnswerRepo =
      new ListeningAndReadingAnswerRepository(mongoClient);
    if (selectedPracticeId) {
      answers = await listeningAndReadingAnswerRepo.findAnswerByPracticeAndUser(
        selectedPracticeId,
        user.id
      );
    }
    completedPractice =
      await listeningAndReadingAnswerRepo.findAllTaskIdsByTaskAndUser(
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
        <Typography
          component="h1"
          sx={{
            position: "absolute",
            width: "1px",
            height: "1px",
            p: 0,
            m: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          CELPIP Listening Practice
        </Typography>
        <ListeningPractice
          showHeader={true}
          allPractices={practices.items}
          selectedPractice={selectedPractice}
          task={task}
          previousAnswer={answers}
          completedPractice={completedPractice}
        />
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
};

export default DashboardApp;
