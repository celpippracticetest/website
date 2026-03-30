import WritingPractice from "@/components/dashboard-app/writing-practice/WritingPractice";
import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgWritingPart from "@/components/icons/WritingPart";
import mongoClient from "@/lib/mongodb";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { currentUser } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { redirect, RedirectType } from "next/navigation";
import SkillLandingPage from "@/components/skill-landing/SkillLandingPage";
import { skillPagesContent } from "@/data/skill-pages-content";
import type { Metadata } from "next";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { Box, Typography } from "@mui/material";
interface PracticeSection {
  tasks: {
    id: string;
    category: string;
    taskNumber: string;
    name: string;
  }[];
  route: string;
}

const writingMetadataBase: Metadata = {
  title: "Free CELPIP Writing Practice Tests & Mock Exams | CELPIPPRACTICETEST",
  description:
    "Get higher CELPIP Writing marks with practice prompts, instant AI feedback, and model answers. Hone grammar, coherence, task response fast | CELPIPPRACTICETEST.com",
  keywords: [
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
    canonical: "https://celpippracticetest.com/writing",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  const { taskId, selectedPracticeId } = await searchParams;
  const isTaskVariant = Boolean(taskId || selectedPracticeId);

  return {
    ...writingMetadataBase,
    robots: isTaskVariant
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
  };
}

const WritingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;

  const taskRepo = new TaskRepository(mongoClient);
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

  const user = await currentUser();
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

    return <SkillLandingPage content={skillPagesContent.writing} skillType="writing" availableTasks={availableTasks} />;
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

  const task: TTaskSchemaDto | null = await taskRepo.findTaskById(taskId ?? "");
  if (!task) {
    redirect("practice-overview", RedirectType.push);
  }

  const practiceRepo = new PracticeRepository(mongoClient);
  const practices = await practiceRepo.getAllPractice(
    {
      type: "WRITING",
      taskId: taskId ? (new ObjectId(taskId) as unknown as string) : undefined,
    },
    0,
    200
  );
  let selectedPractice = null;
  let completedPracticeId: string[] = [];

  if (selectedPracticeId) {
    selectedPractice = await practiceRepo.findPractice(selectedPracticeId);

    if (
      !hasPaidPracticeAccess(
        user?.publicMetadata.plan as string | undefined,
        user?.publicMetadata.purchaseDate as string | undefined
      ) &&
      selectedPractice &&
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
  }
  if (user) {
    const writingAnswerRepo = new WritingAndSpeakingAnswerRepository(mongoClient);
    completedPracticeId =
      await writingAnswerRepo.findAnswersByPracticeIdsAndUser(
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
          CELPIP Writing Practice
        </Typography>
        <WritingPractice
          showHeader={true}
          allPractices={practices.items}
          selectedPractice={selectedPractice}
          task={task}
          completedPracticeId={completedPracticeId}
        />
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
};

export default WritingPage;
