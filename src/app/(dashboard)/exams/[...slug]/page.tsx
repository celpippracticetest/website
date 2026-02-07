import { redirect, RedirectType } from "next/navigation";
import mongoClient from "@/lib/mongodb";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { TExamPartSchemaDto } from "@/models/examParts.model";
import { PracticeDtoSchema } from "@/models/practice.model";
import { ExamRepository } from "@/repositories/exams.repo";
import { TExamSchemaDto } from "@/models/exam.model";
import dynamic from "next/dynamic";

const ListeningExamView = dynamic(() => import("@/components/dashboard-app/exam-parts/ListeningExamView"), {
  loading: () => <p>Loading Listening Exam...</p>,
});
const ReadingExamView = dynamic(() => import("@/components/dashboard-app/exam-parts/ReadingExamView"), {
  loading: () => <p>Loading Reading Exam...</p>,
});
const WritingExamView = dynamic(() => import("@/components/dashboard-app/exam-parts/WritingExamView"), {
  loading: () => <p>Loading Writing Exam...</p>,
});
const SpeakingExamView = dynamic(() => import("@/components/dashboard-app/exam-parts/SpeakingExamView"), {
  loading: () => <p>Loading Speaking Exam...</p>,
});
const ResultExamView = dynamic(() => import("@/components/dashboard-app/exam-parts/ResultExamView"), {
  loading: () => <p>Loading Results...</p>,
});
import { ObjectId } from "mongodb";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { currentUser } from "@clerk/nextjs/server";

const Exam = async ({ params }: { params: { slug: string[] } }) => {
  const resolvedParams = await params;
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
  const roleValue = user?.publicMetadata?.role as unknown;
  const isAdmin: boolean = Array.isArray(roleValue)
    ? roleValue.includes("admin")
    : roleValue === "admin";
  if (!user || (plan !== "premium" && !isAdmin)) {
    redirect("/exam-overview", RedirectType.push);
  }
  if (
    !examId ||
    ((!partNumber || Number.isNaN(parseInt(partNumber))) && !isResultPage)
  ) {
    redirect("/exam-overview", RedirectType.push);
  }
  const examRepo = new ExamRepository(mongoClient);
  const exam: TExamSchemaDto | null = await examRepo.findExamById(examId);
  if (!exam) {
    redirect("/exam-overview", RedirectType.push);
  }
  const examPartsRepo = new ExamPartsRepository(mongoClient);
  if (isResultPage) {
    const examParts = await examPartsRepo.getAllExamPart({
      examId: new ObjectId(examId),
    });
    const answersRepo = new ListeningAndReadingAnswerRepository(mongoClient);
    const writingRepo = new WritingAndSpeakingAnswerRepository(mongoClient);

    const answers = await answersRepo.getAllListeningAndReadingAnswers({
      examId: examId,
      userId: user.id,
    });

    const writingAnswers = await writingRepo.getAllWritingAnswers({
      examId: examId,
      userId: user.id,
      type: "WRITING",
    }, 0, 100);

    const speakingAnswers = await writingRepo.getAllWritingAnswers({
      examId: examId,
      userId: user.id,
      type: "SPEAKING",
    }, 0, 100);

    const speakingAndWritingAnswers = [
      ...writingAnswers.items,
      ...speakingAnswers.items,
    ];

    return (
      <main className=" bg-[#F2F6FF] min-h-screen flex w-full justify-center  max-w-[1280px] mx-auto">
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
      parseInt(partNumber)
    );
  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Exam Part Not Found</h1>
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
