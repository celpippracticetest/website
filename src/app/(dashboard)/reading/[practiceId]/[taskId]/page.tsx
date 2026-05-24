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
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { PracticeSubChrome } from "@/components/practice-seo/PracticeSubChrome";
import ReadingStrategySection from "@/components/practice-seo/ReadingStrategySection";
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
  const taskRepo = new TaskRepository(documentsClient);
  const practiceRepo = new PracticeRepository(documentsClient);
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
  const taskRepo = new TaskRepository(documentsClient);
  const practiceRepo = new PracticeRepository(documentsClient);

  const [task, practices, selectedPractice, hybridUser] = await Promise.all([
    taskRepo.findTaskById(taskId),
    practiceRepo.getAllPractice(
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
