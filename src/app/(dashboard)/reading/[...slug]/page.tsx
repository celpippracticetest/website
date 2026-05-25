import ReadingPractice from "@/components/dashboard-app/reading-practice/ReadingPracticeLazy";
import documentsClient from "@/lib/appDocumentsClient";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { PracticeRepository } from "@/repositories/practice.repo";
import { TaskRepository } from "@/repositories/tasks.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { ObjectId } from "bson";
import { redirect, RedirectType } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { JsonLd } from "@/components/seo/JsonLd";
import { PracticeTaskPickerHeader } from "@/components/practice-seo/PracticeTaskPickerHeader";
import { PracticeSubChrome } from "@/components/practice-seo/PracticeSubChrome";
import ReadingStrategySection from "@/components/practice-seo/ReadingStrategySection";
import {
  absoluteUrl,
  buildPracticeMetaDescription,
  buildPracticePageTitle,
} from "@/lib/practiceSeoCopy";
import { practicePath } from "@/lib/practiceRoutes";
import { skillHubPageMetadata } from "@/lib/skillHubPageMetadata";
import { parsePracticeSlug } from "@/lib/parsePracticeSlug";

const READING_PAGE_URL = "https://celpippracticetest.com/reading";
const READING_PAGE_TITLE =
  "CELPIP Practice Exam: Free CELPIP Reading Practice Test";
const READING_PAGE_DESCRIPTION =
  "CELPIP practice exam for Reading: timed passages, question types, and review. Build accuracy and exam-day confidence.";

const readingStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: READING_PAGE_TITLE,
  description: READING_PAGE_DESCRIPTION,
  url: READING_PAGE_URL,
};

const loadReadingTaskAndPractice = cache(
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

type SlugPageProps = { params: Promise<{ slug: string[] }> };

async function readingTaskPickerPage(taskId: string) {
  const taskRepo = new TaskRepository(documentsClient);
  const task: TTaskSchemaDto | null = await taskRepo.findTaskById(taskId);
  if (!task || task.category !== "reading") {
    redirect("/practice-overview", RedirectType.replace);
  }

  const practiceRepo = new PracticeRepository(documentsClient);
  const hybridUser = await getHybridCurrentUser();
  const user = hybridUser?.user ?? null;
  const practices = await practiceRepo.getPracticeNavList(
    {
      type: "READING",
      taskId: new ObjectId(taskId) as unknown as string,
    },
    0,
    200
  );

  let completedPractice: string[] = [];
  if (user) {
    const listeningAndReadingAnswerRepo =
      new ListeningAndReadingAnswerRepository(documentsClient);
    completedPractice =
      await listeningAndReadingAnswerRepo.findAllTaskIdsByTaskAndUser(
        task.id,
        user.id
      );
  }

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#F2F6FF]">
      <div className="w-full max-w-[1280px]">
        <JsonLd data={readingStructuredData} />
        <PracticeTaskPickerHeader skillLabel="Reading" task={task} />
        <ReadingPractice
          showHeader={true}
          hideTaskPickerHeader
          allPractices={practices.items}
          selectedPractice={null}
          task={task}
          previousAnswer={null}
          completedPractice={completedPractice}
          routeTaskId={taskId}
        />
      </div>
    </main>
  );
}

async function readingPracticeSessionPage(practiceId: string, taskId: string) {
  const taskRepo = new TaskRepository(documentsClient);
  const practiceRepo = new PracticeRepository(documentsClient);

  const [task, practices, selectedPractice, hybridUser] = await Promise.all([
    taskRepo.findTaskById(taskId),
    practiceRepo.getPracticeNavList(
      {
        type: "READING",
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
    const listeningAndReadingAnswerRepo = new ListeningAndReadingAnswerRepository(
      documentsClient
    );
    [answers, completedPractice] = await Promise.all([
      listeningAndReadingAnswerRepo.findAnswerByPracticeAndUser(practiceId, user.id),
      listeningAndReadingAnswerRepo.findAllTaskIdsByTaskAndUser(task.id, user.id),
    ]);
  }

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#F2F6FF]">
      <div className="w-full max-w-[1280px]">
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
        {!user && selectedPractice && !selectedPractice.isFree && (
          <ReadingStrategySection />
        )}
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parsePracticeSlug(slug);
  if (parsed?.kind === "task") {
    return skillHubPageMetadata(
      "reading",
      parsed.taskId,
      READING_PAGE_TITLE,
      READING_PAGE_DESCRIPTION
    );
  }
  if (parsed?.kind === "practice") {
    const { task, practice } = await loadReadingTaskAndPractice(
      parsed.practiceId,
      parsed.taskId
    );
    if (!task || !practice) {
      return { title: "Reading practice" };
    }
    const title = buildPracticePageTitle("reading", task, practice);
    const description = buildPracticeMetaDescription("reading", task, practice);
    const url = absoluteUrl(practicePath("reading", parsed.practiceId, parsed.taskId));
    return {
      title,
      description,
      robots: { index: false, follow: true },
      alternates: { canonical: url },
      openGraph: { title, description, url, siteName: "CELPIPPRACTICETEST", type: "website" },
      twitter: { card: "summary_large_image", title, description },
    };
  }
  return { title: "Reading practice" };
}

export default async function ReadingSlugPage({ params }: SlugPageProps) {
  const { slug } = await params;
  const parsed = parsePracticeSlug(slug);
  if (parsed?.kind === "task") {
    return readingTaskPickerPage(parsed.taskId);
  }
  if (parsed?.kind === "practice") {
    return readingPracticeSessionPage(parsed.practiceId, parsed.taskId);
  }
  redirect("/practice-overview", RedirectType.replace);
}
