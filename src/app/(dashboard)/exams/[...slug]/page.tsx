import { redirect, RedirectType } from "next/navigation";
import documentsClient from "@/lib/appDocumentsClient";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { TExamPartSchemaDto } from "@/models/examParts.model";
import { PracticeDtoSchema } from "@/models/practice.model";
import { ExamRepository } from "@/repositories/exams.repo";
import { TExamSchemaDto } from "@/models/exam.model";
import dynamic from "next/dynamic";
import { Box, Link, Typography } from "@mui/material";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/exams/session");

const MockExamView = dynamic(() => import("@/components/dashboard-app/exam-parts/MockExamView"), {
  loading: () => (
    <Typography sx={{ py: 4, textAlign: "center", color: "#526071" }}>
      Loading Exam...
    </Typography>
  ),
});
const ResultExamView = dynamic(() => import("@/components/dashboard-app/exam-parts/ResultExamView"), {
  loading: () => (
    <Typography sx={{ py: 4, textAlign: "center", color: "#526071" }}>
      Loading Results...
    </Typography>
  ),
});
import { ObjectId } from "bson";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { hasMockExamAccess, normalizeMockExamIdForAccess } from "@/lib/subscriptionAccess";
import { getFirstReadyMockExamId } from "@/lib/getFirstReadyMockExam";

const Exam = async ({ params }: { params: Promise<{ slug: string[] }> }) => {
  const resolvedParams = await params;
  const examId: string | undefined =
    normalizeMockExamIdForAccess(resolvedParams?.slug?.[0]) ?? undefined;
  const partSlug = resolvedParams?.slug?.[1];
  const partMatch =
    typeof partSlug === "string" ? /^part(\d+)$/i.exec(partSlug) : null;
  const partNumber: string | undefined = partMatch?.[1];
  const isResultPage: boolean =
    typeof partSlug === "string" && partSlug.toLowerCase() === "results";
  let user: any = null;
  try {
    const hybridUser = await getHybridCurrentUser();
    user = hybridUser?.user ?? null;
  } catch (e) {
    // Fallback: treat as unauthenticated
    user = null;
  }
  const firstReadyExamId = await getFirstReadyMockExamId();
  const plan: string | undefined = user?.publicMetadata?.plan as
    | string
    | undefined;
  if (
    !user ||
    !hasMockExamAccess(
      plan,
      user?.publicMetadata?.purchaseDate as string | undefined,
      examId,
      firstReadyExamId,
      user?.publicMetadata?.purchasedMockExamIds
    )
  ) {
    redirect("/exam-overview", RedirectType.push);
  }
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
  const examPartsRepo = new ExamPartsRepository(documentsClient);
  if (isResultPage) {
    const examParts = await examPartsRepo.getAllExamPart({
      examId: new ObjectId(examId),
    });
    const answersRepo = new ListeningAndReadingAnswerRepository(documentsClient);
    const writingRepo = new WritingAndSpeakingAnswerRepository(documentsClient);

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
      <Box
        component="main"
        sx={{
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          backgroundColor: "#F2F6FF",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "1280px",
            px: { xs: 2, md: 3 },
            py: { xs: 3, md: 4 },
          }}
        >
          <ResultExamView
            exams={exam}
            examParts={examParts.items}
            answers={answers.items}
            speakingAndWritingAnswers={speakingAndWritingAnswers}
            firstReadyExamId={firstReadyExamId}
          />
        </Box>
      </Box>
    );
  }

  const part: TExamPartSchemaDto | null =
    await examPartsRepo.findExamPartByExamIdAndPartId(
      examId,
      parseInt(partNumber)
    );
  if (!part) {
    return (
      <Box
        component="main"
        sx={{
          minHeight: "100vh",
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F2F6FF",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "540px",
            p: { xs: 3, md: 4 },
            borderRadius: "28px",
            border: "1px solid #E2EAF6",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 18px 40px rgba(55, 70, 92, 0.08)",
            textAlign: "center",
          }}
        >
          <Typography
            component="h1"
            sx={{
              mb: 1.5,
              fontSize: { xs: "1.6rem", md: "2rem" },
              fontWeight: 800,
              color: "#D14343",
            }}
          >
            Exam Part Not Found
          </Typography>
          <Typography sx={{ mb: 1, color: "#526071" }}>
            Could not find exam part for:
          </Typography>
          <Box
            component="ul"
            sx={{
              mb: 3,
              pl: 3,
              textAlign: "left",
              color: "#6B7888",
              "& li": {
                mb: 0.75,
              },
            }}
          >
            <li>Exam ID: {examId}</li>
            <li>Part Number: {partNumber}</li>
          </Box>
          <Link
            href="/exam-overview"
            underline="hover"
            sx={{
              fontWeight: 700,
              color: "#316BFF",
            }}
          >
          Return to Exam Overview
          </Link>
        </Box>
      </Box>
    );
  }
  const practice = PracticeDtoSchema.parse({
    ...part,
    taskId: part.examId.toString(),
  });

  return (
    <Box
      component="main"
      sx={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        backgroundColor: "#F2F6FF",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "1280px",
          px: { xs: 2, md: 3 },
          py: { xs: 3, md: 4 },
        }}
      >
        <MockExamView
          practice={practice}
          partId={parseInt(partNumber)}
          examId={examId}
          partNumber={partNumber}
          examName={exam?.name}
          examNumber={exam?.order}
          firstReadyExamId={firstReadyExamId}
        />
      </Box>
    </Box>
  );
};

export default Exam;
