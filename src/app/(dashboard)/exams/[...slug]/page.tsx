import { redirect, RedirectType } from "next/navigation";
import documentsClient from "@/lib/appDocumentsClient";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { TExamPartSchemaDto } from "@/models/examParts.model";
import { PracticeDtoSchema } from "@/models/practice.model";
import ListeningExamView from "@/components/dashboard-app/exam-parts/ListeningExamView";
import { ExamRepository } from "@/repositories/exams.repo";
import { TExamSchemaDto } from "@/models/exam.model";
import ReadingExamView from "@/components/dashboard-app/exam-parts/ReadingExamView";
import WritingExamView from "@/components/dashboard-app/exam-parts/WritingExamView";
import SpeakingExamView from "@/components/dashboard-app/exam-parts/SpeakingExamView";
import ResultExamView from "@/components/dashboard-app/exam-parts/ResultExamView";
import { ObjectId } from "bson";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { currentUser } from "@/lib/auth/web-auth-session";
import { hasMockExamAccess } from "@/lib/subscriptionAccess";
import { getFirstReadyMockExamId } from "@/lib/getFirstReadyMockExam";
import { isFreeGuestMockExam } from "@/lib/freeMockExam";
import FreeMockResultsAuthGate from "@/components/dashboard-app/exam-parts/FreeMockResultsAuthGate";
import ClaimGuestMockAnswers from "@/components/dashboard-app/exam-parts/ClaimGuestMockAnswers";

const Exam = async ({
  params,
  searchParams,
}: {
  params: { slug: string[] };
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const examId: string | undefined =
    resolvedParams?.slug?.[0]?.split("exam_")?.[1];
  const partNumber: string | undefined =
    resolvedParams?.slug?.[1]?.split("part")?.[1];
  const isResultPage: boolean = resolvedParams?.slug?.[1] === "results";
  let user: any = null;
  try {
    user = await currentUser();
  } catch (e) {
    // Fallback: treat as unauthenticated
    user = null;
  }
  const plan: string | undefined = user?.publicMetadata?.plan as
    | string
    | undefined;
  const purchaseDate = user?.publicMetadata?.purchaseDate;
  const purchasedMockExamIds = user?.publicMetadata?.purchasedMockExamIds;
  const roleValue = user?.publicMetadata?.role as unknown;
  const isAdmin: boolean = Array.isArray(roleValue)
    ? roleValue.includes("admin")
    : roleValue === "admin";
  const firstReadyExamId = await getFirstReadyMockExamId();
  const hasExamAccess =
    !!user &&
    (isAdmin ||
      hasMockExamAccess(
        plan,
        purchaseDate,
        examId ?? null,
        firstReadyExamId,
        purchasedMockExamIds,
      ));
  if (
    !examId ||
    ((!partNumber || Number.isNaN(parseInt(partNumber))) && !isResultPage)
  ) {
    redirect("/exam-overview", RedirectType.push);
  }
  const examRepo = new ExamRepository(documentsClient);
  const exam: TExamSchemaDto | null = await examRepo.findExamById(examId);
  if (!exam) {
    redirect("/exam-overview", RedirectType.push);
  }
  const freeExam = isFreeGuestMockExam(exam);
  const canOpenExam = hasExamAccess || freeExam;
  if (!canOpenExam) {
    redirect("/exam-overview", RedirectType.push);
  }
  if (isResultPage && !user) {
    if (!freeExam) {
      redirect("/exam-overview", RedirectType.push);
    }
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearch)) {
      const raw = Array.isArray(value) ? value[0] : value;
      if (raw) query.set(key, raw);
    }
    const qs = query.toString();
    return (
      <FreeMockResultsAuthGate
        examName={exam.name}
        returnTo={`/exams/exam_${examId}/results${qs ? `?${qs}` : ""}`}
      />
    );
  }
  if (isResultPage && !hasExamAccess && !freeExam) {
    redirect("/exam-overview", RedirectType.push);
  }
  const examPartsRepo = new ExamPartsRepository(documentsClient);
  if (isResultPage) {
    const examParts = await examPartsRepo.getAllExamPart({
      examId: new ObjectId(examId),
    });
    const answersRepo = new ListeningAndReadingAnswerRepository(
      documentsClient,
    );
    const writingRepo = new WritingAndSpeakingAnswerRepository(documentsClient);

    const answers = await answersRepo.getAllListeningAndReadingAnswers({
      examId: examId,
      userId: user.id,
    });

    const writingAnswers = await writingRepo.getAllWritingAnswers(
      {
        examId: examId,
        userId: user.id,
        type: "WRITING",
      },
      0,
      100,
    );

    const speakingAnswers = await writingRepo.getAllWritingAnswers(
      {
        examId: examId,
        userId: user.id,
        type: "SPEAKING",
      },
      0,
      100,
    );

    const speakingAndWritingAnswers = [
      ...writingAnswers.items,
      ...speakingAnswers.items,
    ];

    return (
      <main className=" bg-[#F2F6FF] min-h-screen flex w-full justify-center  max-w-[1280px] mx-auto">
        <ClaimGuestMockAnswers examId={examId} />
        <div className=" mx-auto w-full flex flex-col rounded-lg">
          <ResultExamView
            exams={exam}
            examParts={examParts.items}
            answers={answers.items}
            speakingAndWritingAnswers={speakingAndWritingAnswers}
          />
        </div>
      </main>
    );
  }

  const part: TExamPartSchemaDto | null =
    await examPartsRepo.findExamPartByExamIdAndPartId(
      examId,
      parseInt(partNumber),
    );
  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Exam Part Not Found
        </h1>
        <p className="text-gray-700 mb-2">Could not find exam part for:</p>
        <ul className="text-sm text-gray-600 list-disc mb-6">
          <li>Exam ID: {examId}</li>
          <li>Part Number: {partNumber}</li>
        </ul>
        <a href="/exam-overview" className="text-blue-600 hover:underline">
          Return to Exam Overview
        </a>
      </div>
    );
  }
  const practice = PracticeDtoSchema.parse({
    ...part,
    taskId: part.examId.toString(),
  });

  return (
    <main className="max-w-[1200px] w-full h-full mx-auto">
      <div className=" w-full pb-[24px] px-[16px] screen744:!px-0 flex h-full flex-col rounded-lg">
        {practice.type == "LISTENING" && (
          <ListeningExamView
            examId={examId}
            partNumber={partNumber}
            practice={practice}
            partId={parseInt(partNumber)}
            examName={exam?.name}
            examNumber={exam?.order}
          />
        )}
        {practice.type == "READING" && (
          <ReadingExamView
            practice={practice}
            partNumber={partNumber}
            partId={parseInt(partNumber)}
            examId={examId}
            examName={exam?.name}
            examNumber={exam?.order}
          />
        )}
        {practice.type == "WRITING" && (
          <WritingExamView
            practice={practice}
            partId={parseInt(partNumber)}
            partNumber={partNumber}
            examId={examId}
            examName={exam?.name}
            examNumber={exam?.order}
          />
        )}
        {practice.type == "SPEAKING" && (
          <SpeakingExamView
            practice={practice}
            partId={parseInt(partNumber)}
            examId={examId}
            partNumber={partNumber}
            examName={exam?.name}
            examNumber={exam?.order}
          />
        )}
      </div>
    </main>
  );
};

export default Exam;
