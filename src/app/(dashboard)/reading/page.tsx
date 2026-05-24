import ReadingPractice from "@/components/dashboard-app/reading-practice/ReadingPracticeLazy";
import ShowTasks from "@/components/dashboard-new/ShowTasks/ShowTasksLazy";
import ShowTaskHeader from "@/components/dashboard-new/ShowTasks/ShowTaskHeaderLazy";
import SvgReadingPart from "@/components/icons/ReadingPart";
import documentsClient from "@/lib/appDocumentsClient";
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
import { JsonLd } from "@/components/seo/JsonLd";
import type { Metadata } from "next";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { Box, Typography } from "@mui/material";
import { skillHubPageMetadata } from "@/lib/skillHubPageMetadata";

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
      name: "CELPIP Reading Practice Exam",
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
  const { taskId } = await searchParams;
  const hubMeta = await skillHubPageMetadata(
    "reading",
    taskId,
    READING_PAGE_TITLE,
    READING_PAGE_DESCRIPTION,
    { openGraph: readingMetadataBase.openGraph }
  );
  return {
    keywords: readingMetadataBase.keywords,
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

function sortReadingTasks<T extends { taskNumber: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const numA = parseInt(a.taskNumber.replace(/\D/g, ""), 10);
    const numB = parseInt(b.taskNumber.replace(/\D/g, ""), 10);
    return numA - numB;
  });
}

function toReadingTaskRows(
  items: {
    id: string;
    category: string;
    taskNumber: string;
    name: string;
  }[]
) {
  return sortReadingTasks(items).map((taskItem) => ({
    id: taskItem.id,
    category: taskItem.category,
    taskNumber: taskItem.taskNumber,
    name: taskItem.name,
  }));
}

const ReadingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { selectedPracticeId, taskId } = await searchParams;

  const taskRepo = new TaskRepository(documentsClient);
  const [tasks, hybridUser] = await Promise.all([
    taskRepo.getAllTask({ type: "practice", category: "reading" }, 0, 100),
    getHybridCurrentUser(),
  ]);

  const readingTaskItems = toReadingTaskRows(tasks.items);
  const readingTasks: PracticeSection[] = [
    {
      tasks: readingTaskItems,
      route: "reading",
    },
  ];

  const user = hybridUser?.user ?? null;
  if (!user && !taskId && !selectedPracticeId) {
    const availableTasks = readingTaskItems.map((taskItem) => ({
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

  if (selectedPracticeId && taskId) {
    permanentRedirect(`/reading/${selectedPracticeId}/${taskId}`);
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

  const practiceRepo = new PracticeRepository(documentsClient);
  const [practices, selectedPracticeFromDb] = await Promise.all([
    practiceRepo.getAllPractice(
      {
        type: "READING",
        taskId: new ObjectId(taskId) as unknown as string,
      },
      0,
      200
    ),
    selectedPracticeId
      ? practiceRepo.findPractice(selectedPracticeId)
      : Promise.resolve(null),
  ]);
  let selectedPractice = selectedPracticeFromDb;

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
      new ListeningAndReadingAnswerRepository(documentsClient);
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
