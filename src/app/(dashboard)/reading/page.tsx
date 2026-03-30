import ReadingPractice from "@/components/dashboard-app/reading-practice/ReadingPractice";
import ShowTasks from "@/components/dashboard-new/ShowTasks";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/Header";
import SvgReadingPart from "@/components/icons/ReadingPart";
import mongoClient from "@/lib/mongodb";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { currentUser } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { redirect, RedirectType } from "next/navigation";
import SkillLandingPage from "@/components/skill-landing/SkillLandingPage";
import { skillPagesContent } from "@/data/skill-pages-content";
import { JsonLd } from "@/components/seo/JsonLd";
import type { Metadata } from "next";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { Box, Typography } from "@mui/material";

const READING_PAGE_URL = "https://celpippracticetest.com/reading";
const READING_PAGE_TITLE =
  "CELPIP Practice Exam: Free CELPIP Reading Practice Test";
const READING_PAGE_DESCRIPTION =
  "Practice the CELPIP Reading test with timed tasks, answer explanations, and realistic question types. Train correspondence, diagram, information, and viewpoints skills with a free CELPIP practice exam.";

const readingMetadataBase: Metadata = {
  title: READING_PAGE_TITLE,
  description: READING_PAGE_DESCRIPTION,
  keywords: [
    "celpip practice exam",
    "free celpip practice exam",
    "celpip reading practice test",
    "celpip reading test",
    "celpip reading exam",
    "celpip reading questions",
    "celpip reading mock test",
    "celpip reading sample test",
    "celpip reading sample",
    "celpip reading test sample",
    "celpip general reading",
    "celpip general reading test",
  ],
  alternates: {
    canonical: READING_PAGE_URL,
  },
  openGraph: {
    title: READING_PAGE_TITLE,
    description: READING_PAGE_DESCRIPTION,
    url: READING_PAGE_URL,
    siteName: "CELPIPPRACTICETEST",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: READING_PAGE_TITLE,
    description: READING_PAGE_DESCRIPTION,
  },
};

const readingStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: READING_PAGE_TITLE,
      description: READING_PAGE_DESCRIPTION,
      url: READING_PAGE_URL,
      inLanguage: "en",
    },
    {
      "@type": "Product",
      name: "CELPIP Reading Practice Tests",
      description: READING_PAGE_DESCRIPTION,
      brand: {
        "@type": "Brand",
        name: "CELPIPPRACTICETEST",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5",
        reviewCount: "8",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: skillPagesContent.reading.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ],
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  await searchParams;

  return {
    ...readingMetadataBase,
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

const ReadingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;

  const taskRepo = new TaskRepository(mongoClient);
  const tasks = await taskRepo.getAllTask({ type: "practice" }, 0, 100);

  const readingTasks: PracticeSection[] = [
    {
      tasks: tasks.items
        .filter((taskItem) => taskItem.category === "reading")
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
      route: "reading",
    },
  ];

  const user = await currentUser();
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = tasks.items
      .filter((taskItem) => taskItem.category === "reading")
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
        <JsonLd data={readingStructuredData} />
        <SkillLandingPage
          content={skillPagesContent.reading}
          skillType="reading"
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
            <SvgReadingPart />
          </Box>
          <Typography component="h1" sx={{ color: "#37465C", fontWeight: 600, fontSize: 20 }}>
            CELPIP Reading Practice Test
          </Typography>
        </Box>
        <ShowTasks tasks={readingTasks} />
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
      type: "READING",
      taskId: taskId ? (new ObjectId(taskId) as unknown as string) : undefined,
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
        <JsonLd data={readingStructuredData} />
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
          CELPIP Practice Exam for Reading
        </Typography>
        <ReadingPractice
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
};

export default ReadingPage;
