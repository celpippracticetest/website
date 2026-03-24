import ExamOverview from "@/components/dashboard-app/examOverview";
import mongoClient from "@/lib/mongodb";
import { TListeningAndReadingAnswerDto, TWritingAnswerDto } from "@/models/answer";
import { ExamRepository } from "@/repositories/exams.repo";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { ListeningAndReadingAnswerRepository } from "@/repositories/listeningAndReadingAnswers.repo";
import { WritingAndSpeakingAnswerRepository } from "@/repositories/writingAndSpeakingAnswers.repo";
import { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import ExamFAQ, { FAQ_DATA } from "@/components/dashboard-app/ExamFAQ";
import { Box, Paper, Stack, Typography } from "@mui/material";

type ExamProgressSummary = {
  completedParts: number;
  totalParts: number;
  completionPercentage: number;
};

const DEFAULT_EXAM_PART_COUNT = 20;
const EXAM_PART_FETCH_LIMIT = 5000;
const ANSWER_FETCH_LIMIT = 5000;

const getAttemptKey = (attemptId?: string | null) => attemptId || "legacy";

const hasCompletedListeningOrReadingPart = (
  answer: TListeningAndReadingAnswerDto
) =>
  Boolean(
    answer.examId &&
      answer.partId &&
      answer.answers &&
      Object.keys(answer.answers).length > 0
  );

const hasCompletedWritingOrSpeakingPart = (answer: TWritingAnswerDto) => {
  if (!answer.examId || !answer.partId) {
    return false;
  }

  if (answer.audioUrl || answer.text?.trim()) {
    return true;
  }

  if (answer.overalScore !== undefined) {
    return true;
  }

  return Boolean(answer.result && Object.keys(answer.result).length > 0);
};

const buildExamProgressById = ({
  examIds,
  examPartCountsById,
  listeningAndReadingAnswers,
  writingAndSpeakingAnswers,
}: {
  examIds: string[];
  examPartCountsById: Record<string, number>;
  listeningAndReadingAnswers: TListeningAndReadingAnswerDto[];
  writingAndSpeakingAnswers: TWritingAnswerDto[];
}): Record<string, ExamProgressSummary> => {
  const attemptsByExamId = new Map<string, Map<string, Set<number>>>();

  const registerCompletedPart = (
    examId?: string,
    partId?: number,
    attemptId?: string | null
  ) => {
    if (!examId || !partId) {
      return;
    }

    const normalizedAttemptId = getAttemptKey(attemptId);
    const examAttempts = attemptsByExamId.get(examId) ?? new Map<string, Set<number>>();
    const completedParts = examAttempts.get(normalizedAttemptId) ?? new Set<number>();

    completedParts.add(partId);
    examAttempts.set(normalizedAttemptId, completedParts);
    attemptsByExamId.set(examId, examAttempts);
  };

  listeningAndReadingAnswers
    .filter(hasCompletedListeningOrReadingPart)
    .forEach((answer) => {
      registerCompletedPart(answer.examId, answer.partId, answer.attemptId);
    });

  writingAndSpeakingAnswers
    .filter(hasCompletedWritingOrSpeakingPart)
    .forEach((answer) => {
      registerCompletedPart(answer.examId, answer.partId, answer.attemptId);
    });

  return examIds.reduce<Record<string, ExamProgressSummary>>((acc, examId) => {
    const totalParts = examPartCountsById[examId] ?? DEFAULT_EXAM_PART_COUNT;
    const examAttempts = attemptsByExamId.get(examId);
    const completedParts = examAttempts
      ? Array.from(examAttempts.values()).reduce(
          (maxCompletedParts, completedPartIds) =>
            Math.max(maxCompletedParts, completedPartIds.size),
          0
        )
      : 0;

    acc[examId] = {
      completedParts,
      totalParts,
      completionPercentage:
        totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0,
    };

    return acc;
  }, {});
};

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title:
      "CELPIP Practice Tests – Full Mock Exams Online | CELPIP Practice Test",
    description:
      "Prepare for the CELPIP exam with realistic full-length practice tests in the official test format. Start a CELPIP mock exam and prepare with confidence.",
    alternates: {
      canonical: "https://celpippracticetest.com/exam-overview",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

const ExamsPage = async () => {
  const exampRepo = new ExamRepository(mongoClient);
  const result = await exampRepo.getAllExam({ isReady: true }, 0, 1000);
  const user = await currentUser();
  const noUser = !user;
  const examIds = result.items.map((exam) => exam.id);
  let examProgressById: Record<string, ExamProgressSummary> = {};

  if (user) {
    const examPartsRepo = new ExamPartsRepository(mongoClient);
    const listeningAndReadingAnswerRepo = new ListeningAndReadingAnswerRepository(
      mongoClient
    );
    const writingAndSpeakingAnswerRepo = new WritingAndSpeakingAnswerRepository(
      mongoClient
    );

    const [examPartsResult, listeningAndReadingResult, writingAndSpeakingResult] =
      await Promise.all([
        examPartsRepo.getAllExamPart({}, 0, EXAM_PART_FETCH_LIMIT),
        listeningAndReadingAnswerRepo.getAllListeningAndReadingAnswers(
          { userId: user.id },
          0,
          ANSWER_FETCH_LIMIT
        ),
        writingAndSpeakingAnswerRepo.getAllWritingAnswers(
          { userId: user.id },
          0,
          ANSWER_FETCH_LIMIT
        ),
      ]);

    const examPartCountsById = examPartsResult.items.reduce<Record<string, number>>(
      (acc, examPart) => {
        acc[examPart.examId] = (acc[examPart.examId] ?? 0) + 1;
        return acc;
      },
      {}
    );

    examProgressById = buildExamProgressById({
      examIds,
      examPartCountsById,
      listeningAndReadingAnswers: listeningAndReadingResult.items.filter((answer) =>
        Boolean(answer.examId)
      ),
      writingAndSpeakingAnswers: writingAndSpeakingResult.items.filter((answer) =>
        Boolean(answer.examId)
      ),
    });
  }

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
        {noUser ? (
          <Box sx={{ mb: { xs: 4, md: 5 } }}>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: FAQ_DATA.map((faq) => ({
                    "@type": "Question",
                    name: faq.question,
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: faq.answer,
                    },
                  })),
                }),
              }}
            />

            <Paper
              elevation={0}
              sx={{
                overflow: "hidden",
                borderRadius: "28px",
                border: "1px solid #E2EAF6",
                background:
                  "linear-gradient(135deg, rgba(74, 125, 255, 0.16), rgba(13, 170, 148, 0.10))",
              }}
            >
              <Box
                sx={{
                  px: { xs: 3, md: 6 },
                  py: { xs: 4, md: 6 },
                  background:
                    "linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.96))",
                }}
              >
                <Stack spacing={2.5} alignItems="center" textAlign="center">
                  <Box
                    sx={{
                      px: 1.75,
                      py: 0.75,
                      borderRadius: "999px",
                      backgroundColor: "rgba(74, 125, 255, 0.10)",
                      color: "#4A7DFF",
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                    }}
                  >
                    Full-length CELPIP preparation
                  </Box>
                  <Typography
                    component="h1"
                    sx={{
                      maxWidth: "940px",
                      fontSize: { xs: "2rem", md: "3rem" },
                      lineHeight: { xs: 1.2, md: 1.15 },
                      fontWeight: 800,
                      color: "#37465C",
                    }}
                  >
                    CELPIP Practice Tests - Full Mock Exams Online
                  </Typography>
                  <Typography
                    sx={{
                      maxWidth: "820px",
                      fontSize: { xs: "1.05rem", md: "1.35rem" },
                      lineHeight: 1.6,
                      fontWeight: 600,
                      color: "#415167",
                    }}
                  >
                    Prepare for the CELPIP exam with realistic full-length practice tests in the
                    official test format.
                  </Typography>
                  <Typography
                    sx={{
                      maxWidth: "920px",
                      fontSize: { xs: "0.98rem", md: "1.05rem" },
                      lineHeight: 1.85,
                      color: "#526071",
                    }}
                  >
                    Practice with full mock exams designed to mirror the real exam structure. Each
                    test includes listening, reading, writing, and speaking sections with authentic
                    timing so you can build confidence before test day.
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: 1.25,
                    }}
                  >
                    {["Listening", "Reading", "Writing", "Speaking"].map((label) => (
                      <Box
                        key={label}
                        sx={{
                          px: 1.75,
                          py: 0.9,
                          borderRadius: "999px",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E2EAF6",
                          color: "#4B5A70",
                          fontSize: "0.8125rem",
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </Box>
                    ))}
                  </Box>
                </Stack>
              </Box>
            </Paper>
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              mb: { xs: 3, md: 4 },
              px: { xs: 3, md: 4 },
              py: { xs: 3, md: 3.5 },
              borderRadius: "24px",
              border: "1px solid #E2EAF6",
              backgroundColor: "#FFFFFF",
            }}
          >
            <Stack spacing={1}>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "1.75rem", md: "2rem" },
                  lineHeight: 1.2,
                  fontWeight: 800,
                  color: "#37465C",
                }}
              >
                CELPIP Mock Exams
              </Typography>
              <Typography
                sx={{
                  maxWidth: "760px",
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  color: "#526071",
                }}
              >
                Choose a full-length mock exam or jump into one section to focus on the skill you
                want to improve today.
              </Typography>
            </Stack>
          </Paper>
        )}

        <Box id="exam-overview-list">
          <ExamOverview
            exams={result.items}
            examProgressById={examProgressById}
            showUserProgress={Boolean(user)}
          />
        </Box>

        {noUser && (
          <Paper
            component="section"
            elevation={0}
            sx={{
              mt: { xs: 4, md: 5 },
              mb: { xs: 3, md: 4 },
              px: { xs: 3, md: 4 },
              py: { xs: 3, md: 4 },
              borderRadius: "24px",
              border: "1px solid #E2EAF6",
              backgroundColor: "#FFFFFF",
            }}
          >
            <Stack spacing={2}>
              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "1.4rem", md: "1.65rem" },
                  lineHeight: 1.25,
                  fontWeight: 700,
                  color: "#37465C",
                }}
              >
                How to use CELPIP mock exams effectively
              </Typography>
              <Typography
                sx={{
                  fontSize: "1rem",
                  lineHeight: 1.85,
                  color: "#526071",
                }}
              >
                Full-length CELPIP practice tests work best as performance checkpoints, not only as
                last-minute drills. Simulate real timing, complete all sections in one sitting, and
                review your weakest question types right after each exam.
              </Typography>
              <Typography
                sx={{
                  fontSize: "1rem",
                  lineHeight: 1.85,
                  color: "#526071",
                }}
              >
                Track your results across multiple mock exams to see whether listening accuracy,
                reading speed, writing organization, and speaking fluency are improving.
                Consistent review between tests is what turns practice into real score gains.
              </Typography>
            </Stack>
          </Paper>
        )}

        {noUser && (
          <Box sx={{ pb: { xs: 4, md: 6 } }}>
            <ExamFAQ />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ExamsPage;
