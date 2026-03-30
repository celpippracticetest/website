import SpeakingPractice from "@/components/dashboard-app/speaking-practice/SpeakingPractice";
import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
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

const speakingMetadataBase: Metadata = {
  title:
    "Free CELPIP Speaking Practice Tests & Mock Exams | CELPIPPRACTICETEST",
  description:
    "Simulate the real CELPIP Speaking test with timed tasks, AI grading, and expert tips. Track progress, boost fluency, and hit your target score | CELPIPPRACTICETEST.com",
  keywords: [
    "celpip speaking practice test",
    "celpip speaking test",
    "celpip speaking practice",
    "celpip practice test speaking",
    "celpip sample speaking questions",
    "celpip practice speaking test",
    "celpip general speaking sample test",
  ],
  alternates: {
    canonical: "https://celpippracticetest.com/speaking",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  await searchParams;

  return {
    ...speakingMetadataBase,
    robots: {
      index: true,
      follow: true,
    },
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
  const taskRepo = new TaskRepository(mongoClient);
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

  const user = await currentUser();
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

    return <SkillLandingPage content={skillPagesContent.speaking} skillType="speaking" availableTasks={availableTasks} />;
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
  const task: TTaskSchemaDto | null = await taskRepo.findTaskById(taskId ?? "");
  if (!task) {
    redirect("practice-overview", RedirectType.replace);
    return <div></div>;
  }

  const practiceRepo = new PracticeRepository(mongoClient);
  const practices = await practiceRepo.getAllPractice(
    {
      type: "SPEAKING",
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
          CELPIP Speaking Practice
        </Typography>
        <SpeakingPractice
          showHeader={true}
          allPractices={practices.items}
          selectedPractice={selectedPractice}
          task={task}
          completedPracticeId={completedPracticeId}
        />
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
};

export default SpeakingPage;
