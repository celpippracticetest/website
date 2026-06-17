import ExamOverview from "@/components/dashboard-app/examOverview";
import documentsClient from "@/lib/appDocumentsClient";
import { ExamRepository } from "@/repositories/exams.repo";
import { Metadata } from "next";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import ExamFAQ from "@/components/dashboard-app/ExamFAQ";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildExamOverviewStructuredData } from "@/lib/seo/siteSchema";
import { Paper, Stack, Typography } from "@mui/material";
import {
  coercePurchasedMockExamIds,
  normalizeMockExamIdForAccess,
} from "@/lib/subscriptionAccess";
import type { TExamSchemaDto } from "@/models/exam.model";
import { getUiAbVariant } from "@/lib/uiAbTest.server";
import { Box } from "@/components/ui/Box";

export const revalidate = 3600;

const examOverviewTimingLog =
  process.env.NODE_ENV === "development" ||
  process.env.EXAM_OVERVIEW_TIMING_LOG === "1";

const examOverviewNavy = "#1B2B5A";
const examOverviewMuted = "#475569";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  return {
    title: "CELPIP Mock Test Online — Full-Length Practice Exams",
    description:
      "Take a realistic CELPIP mock test online in one sitting—listening, reading, writing, and speaking in official-style timing. Start a full-length CELPIP practise test online and track your readiness.",
    alternates: {
      canonical: "https://celpippracticetest.com/exam-overview",
    },
    robots: getIndexingRobotsDirective(appBaseUrl),
  };
}

const ExamsPage = async () => {
  const uiVariant = await getUiAbVariant();
  const isClassic = uiVariant === "classic";
  const tPageStart = performance.now();
  const exampRepo = new ExamRepository(documentsClient);
  const [result, hybridUser] = await Promise.all([
    exampRepo.getAllExam({ isReady: true }, 0, 1000),
    getHybridCurrentUser(),
  ]);
  const tAfterExamsAndUser = performance.now();
  const user = hybridUser?.user ?? null;
  const noUser = !user;

  const purchasedIdsRaw = user
    ? (user.publicMetadata as Record<string, unknown> | undefined)?.purchasedMockExamIds
    : undefined;
  const purchasedIdSet = new Set(coercePurchasedMockExamIds(purchasedIdsRaw));
  const examsForOverview: TExamSchemaDto[] = [...result.items].sort((a, b) => {
    const aKey = normalizeMockExamIdForAccess(a.id);
    const bKey = normalizeMockExamIdForAccess(b.id);
    const aPurchased = Boolean(aKey && purchasedIdSet.has(aKey));
    const bPurchased = Boolean(bKey && purchasedIdSet.has(bKey));
    if (aPurchased !== bPurchased) {
      return aPurchased ? -1 : 1;
    }
    return (a.order ?? 0) - (b.order ?? 0);
  });

  if (examOverviewTimingLog) {
    const examsAndUserMs = tAfterExamsAndUser - tPageStart;
    console.log("[exam-overview/timing] server", {
      examsAndUserMs: +examsAndUserMs.toFixed(1),
      examCount: examsForOverview.length,
      signedIn: Boolean(user),
      examCardsFromServer: true,
      progressLoad: user ? "client" : "n/a",
    });
  }

  const examOverviewStructuredData = buildExamOverviewStructuredData(
    examsForOverview,
    process.env.APP_BASE_URL,
  );

  return (
    <main
      className={
        isClassic
          ? "mx-auto w-full max-w-[1280px] px-[16px] pt-[24px] screen744:!px-0"
          : "flex min-h-screen w-full justify-center bg-transparent"
      }
    >
      <div
        className={
          isClassic
            ? "w-full"
            : "w-full max-w-[1280px] bg-transparent px-4 py-6 md:px-6 md:py-8"
        }
      >
        <JsonLd data={examOverviewStructuredData} />
        {isClassic ? (
          noUser ? (
            <Box className="mb-8 flex w-full flex-col items-center justify-center gap-4 px-4 text-center">
              <h1 className="pt-[20px] text-[32px] font-bold leading-[40px] text-[#37465C] screen744:pt-0 screen744:text-[48px] screen744:leading-[56px]">
                CELPIP Practice Tests – Full Mock Exams Online
              </h1>
              <h2 className="max-w-[800px] text-[18px] font-medium leading-[28px] text-[#37465C] screen744:text-[24px] screen744:leading-[32px]">
                Prepare for the CELPIP exam with realistic full-length practice tests in the
                official test format.
              </h2>
              <p className="max-w-[900px] text-[16px] leading-[24px] text-[#526071]">
                Practice for the CELPIP exam with full-length mock tests designed to match the real
                exam structure. Each practice test includes listening, reading, writing, and
                speaking sections with authentic timing and question types. Start a CELPIP mock
                exam and prepare with confidence.
              </p>
            </Box>
          ) : (
            <h2 className="mb-4 text-center text-2xl font-bold text-[#37465C] screen744:text-left">
              CELPIP Mock Exams
            </h2>
          )
        ) : noUser ? (
          <div className="mb-8 md:mb-10">
            <Paper
              elevation={0}
              sx={{
                mb: { xs: 3, md: 4 },
                px: { xs: 3, md: 4 },
                py: { xs: 3, md: 3.5 },
                borderRadius: "16px",
                border: "1px solid rgba(27, 43, 90, 0.08)",
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
                    color: examOverviewNavy,
                  }}
                >
                  CELPIP Mock Exams
                </Typography>
                <Typography
                  sx={{
                    maxWidth: "640px",
                    fontSize: "1rem",
                    lineHeight: 1.6,
                    color: examOverviewMuted,
                  }}
                >
                  Full-length practice tests with official-style timing for Listening, Reading,
                  Writing, and Speaking.
                </Typography>
              </Stack>
            </Paper>
          </div>
        ) : (
          <Paper
            elevation={0}
            sx={{
              mb: { xs: 3, md: 4 },
              px: { xs: 3, md: 4 },
              py: { xs: 3, md: 3.5 },
              borderRadius: "24px",
              border: "1px solid rgba(27, 43, 90, 0.10)",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Stack spacing={1}>
              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "1.75rem", md: "2rem" },
                  lineHeight: 1.2,
                  fontWeight: 800,
                  color: examOverviewNavy,
                }}
              >
                CELPIP Mock Exams
              </Typography>
              <Typography
                sx={{
                  maxWidth: "760px",
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  color: examOverviewMuted,
                }}
              >
                Choose a full-length mock exam or jump into one section to focus on the skill you
                want to improve today.
              </Typography>
            </Stack>
          </Paper>
        )}

        <div id="exam-overview-list">
          <ExamOverview
            exams={examsForOverview}
            examProgressById={{}}
            showUserProgress={Boolean(user)}
            loadExamProgressClientSide={Boolean(user)}
            rscUserAccessSnapshot={
              user
                ? {
                    purchasedMockExamIds: (
                      user.publicMetadata as Record<string, unknown> | undefined
                    )?.purchasedMockExamIds,
                  }
                : undefined
            }
            timingLog={examOverviewTimingLog}
          />
        </div>

        {noUser && !isClassic && (
          <Paper
            component="section"
            elevation={0}
            sx={{
              mt: { xs: 4, md: 5 },
              mb: { xs: 3, md: 4 },
              px: { xs: 3, md: 4 },
              py: { xs: 3, md: 4 },
              borderRadius: "24px",
              border: "1px solid rgba(27, 43, 90, 0.10)",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Stack spacing={2}>
              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "1.4rem", md: "1.65rem" },
                  lineHeight: 1.25,
                  fontWeight: 700,
                  color: examOverviewNavy,
                }}
              >
                How to use CELPIP mock exams effectively
              </Typography>
              <Typography
                sx={{
                  fontSize: "1rem",
                  lineHeight: 1.85,
                  color: examOverviewMuted,
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
                  color: examOverviewMuted,
                }}
              >
                Track your results across multiple mock exams to see whether listening accuracy,
                reading speed, writing organization, and speaking fluency are improving. Consistent
                review between tests is what turns practice into real score gains.
              </Typography>
            </Stack>
          </Paper>
        )}

        {noUser && (
          <div className="pb-8 md:pb-12">
            <ExamFAQ />
          </div>
        )}
      </div>
    </main>
  );
};

export default ExamsPage;
