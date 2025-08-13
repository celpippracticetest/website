import { redirect, RedirectType } from "next/navigation";
import mongoClient from "@/lib/mongodb";
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
import { ObjectId } from "mongodb";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { currentUser } from "@clerk/nextjs/server";

const Exam = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const examId: string | undefined = (await params).slug[0].split("exam_")[1];
  const partNumber: string | undefined = (await params).slug[1].split(
    "part"
  )[1];
  const isResultPage: boolean = (await params).slug[1] === "results";
  const user: any = await currentUser();
  if (
    !user ||
    (user &&
      user.publicMetadata.plan !== "premium" &&
      !user.publicMetadata.role.includes("admin"))
  ) {
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
    const answers = await answersRepo.getAllListeningAndReadingAnswers({
      examId: examId,
      userId: user.id,
    });

    const speakingAndWritingAnswers =
      await answersRepo.findAnswersByExamIdAndUser(examId, user.id);

    return (
      <main className="bg-[#F2F6FF] min-h-screen flex w-full  p-[16px] screen1280:!p-[24px] ">
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
    redirect("/exam-overview", RedirectType.push);
  }
  const practice = PracticeDtoSchema.parse({
    ...part,
    taskId: part.examId.toString(),
  });
  return (
    <main className="max-w-[995px] w-full h-full mx-auto">
      <div className=" w-full p-[24px] flex h-full flex-col rounded-lg">
        {practice.type == "LISTENING" && (
          <ListeningExamView
            examId={examId}
            partNumber={partNumber}
            practice={practice}
            partId={parseInt(partNumber)}
          />
        )}
        {practice.type == "READING" && (
          <ReadingExamView practice={practice} partId={parseInt(partNumber)} />
        )}
        {practice.type == "WRITING" && (
          <WritingExamView practice={practice} partId={parseInt(partNumber)} />
        )}
        {practice.type == "SPEAKING" && (
          <SpeakingExamView practice={practice} partId={parseInt(partNumber)} />
        )}
      </div>
    </main>
  );
};

export default Exam;
