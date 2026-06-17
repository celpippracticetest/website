"use client";

import { TExamSchemaDto } from "@/models/exam.model";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { isForceSignedOut } from "@/lib/auth/shared-web-auth";
import {
  Box,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Button } from "@/components/v2/Button";
import { useRouter } from "nextjs-toploader/app";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import LoginModal from "../modal/LoginModal";
import { scheduleIdleTask } from "@/lib/scheduleIdle";
import {
  hasMockExamAccess,
  isMockExamUnlockedViaPurchase,
  normalizeMockExamIdForAccess,
  normalizePlan,
} from "@/lib/subscriptionAccess";
import type { ExamProgressSummary } from "@/lib/examOverviewProgress";
import { useUiVariant } from "@/components/ui-variant/UiVariantProvider";
import ExamOverviewClassic from "@/components/ui-variants/classic/dashboard/ExamOverviewClassic";

const examCardNavy = "#1B2B5A";

const examSections = [
  { label: "Listening", partId: 1, section: "listening" },
  { label: "Reading", partId: 7, section: "reading" },
  { label: "Writing", partId: 11, section: "writing" },
  { label: "Speaking", partId: 13, section: "speaking" },
] as const;

type ExamOverviewCardProps = {
  exam: TExamSchemaDto;
  unlocked: boolean;
  purchasedUnlock: boolean;
  isFreeMockExam: boolean;
  showUserProgress: boolean;
  loadExamProgressClientSide: boolean;
  examProgressReady: boolean;
  progress?: ExamProgressSummary;
  primaryLabel: string;
  onSectionStart: (
    exam: TExamSchemaDto,
    partId: number,
    section?: string
  ) => void;
  onPrimaryAction: (exam: TExamSchemaDto) => void;
};

const ExamOverviewCard = memo(function ExamOverviewCard({
  exam,
  unlocked,
  purchasedUnlock,
  isFreeMockExam,
  showUserProgress,
  loadExamProgressClientSide,
  examProgressReady,
  progress,
  primaryLabel,
  onSectionStart,
  onPrimaryAction,
}: ExamOverviewCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: {
          xs: "100%",
          sm: "calc(50% - 8px)",
          lg: "calc(25% - 12px)",
        },
        maxWidth: {
          xs: "100%",
          sm: "calc(50% - 8px)",
          lg: "calc(25% - 12px)",
        },
        flexGrow: 1,
        minHeight: showUserProgress ? 286 : 228,
        p: 3,
        borderRadius: "24px",
        border: "1px solid rgba(27, 43, 90, 0.10)",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        boxShadow: "0 12px 36px rgba(15, 23, 42, 0.06)",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": {
          boxShadow: "0 20px 48px rgba(15, 23, 42, 0.10)",
          borderColor: "rgba(37, 99, 235, 0.28)",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(13, 170, 148, 0.04))",
          opacity: 0.95,
          pointerEvents: "none",
        }}
      />

      <Stack
        sx={{
          position: "relative",
          height: "100%",
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography
              component="h2"
              sx={{
                fontSize: { xs: "1.125rem", md: "1.25rem" },
                lineHeight: 1.3,
                fontWeight: 800,
                color: examCardNavy,
                letterSpacing: "-0.02em",
              }}
            >
              {exam.name}
            </Typography>
            {isFreeMockExam ? (
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: 0.75,
                  py: 0.125,
                  borderRadius: "999px",
                  fontSize: "0.625rem",
                  lineHeight: 1.2,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  color: "#0D9488",
                  backgroundColor: "#ECFDF5",
                  border: "1px solid #99F6E4",
                }}
              >
                Free
              </Box>
            ) : (
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: 0.75,
                  py: 0.125,
                  borderRadius: "999px",
                  fontSize: "0.625rem",
                  lineHeight: 1.2,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  color: "#C05621",
                  backgroundColor: "#FFF4ED",
                  border: "1px solid #FDBA74",
                }}
              >
                Pro
              </Box>
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              alignItems: "stretch",
            }}
          >
            {examSections.map((skill) => (
              <Box
                key={skill.label}
                component="button"
                type="button"
                disabled={!unlocked}
                onClick={() => onSectionStart(exam, skill.partId, skill.section)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "calc(50% - 4px)",
                  minHeight: 38,
                  cursor: unlocked ? "pointer" : "not-allowed",
                  appearance: "none",
                  outline: "none",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: "999px",
                  backgroundColor: unlocked ? "#F2F6FF" : "#F8FAFC",
                  color: unlocked ? "#212E42" : "#37465C",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  textAlign: "center",
                  border: unlocked
                    ? "1.5px solid #316BFF"
                    : "1.5px solid rgba(49, 107, 255, 0.45)",
                  transition:
                    "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
                  "&:hover:not(:disabled)": {
                    backgroundColor: "#E3EBFF",
                    borderColor: "#2554D4",
                    color: "#1B2B5A",
                  },
                  "&:focus-visible": {
                    borderColor: "#316BFF",
                    boxShadow: "0 0 0 3px rgba(49, 107, 255, 0.25)",
                  },
                }}
              >
                {skill.label}
              </Box>
            ))}
          </Box>

          {showUserProgress && loadExamProgressClientSide && !examProgressReady && (
            <Skeleton
              variant="rounded"
              height={8}
              sx={{ borderRadius: "999px", mt: 0.25 }}
            />
          )}
          {showUserProgress &&
            examProgressReady &&
            progress &&
            progress.completionPercentage > 0 && (
            <Stack spacing={0.85}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#64748B",
                  }}
                >
                  Completion
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color:
                      progress.completionPercentage === 100
                        ? "#0D9488"
                        : "#2563EB",
                  }}
                >
                  {progress.completionPercentage}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress.completionPercentage}
                sx={{
                  height: 8,
                  borderRadius: "999px",
                  backgroundColor: "#E2E8F0",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: "999px",
                    background:
                      progress.completionPercentage === 100
                        ? "linear-gradient(90deg, #0D9488, #14B8A6)"
                        : "linear-gradient(90deg, #2563EB, #60A5FA)",
                  },
                }}
              />
            </Stack>
          )}
        </Stack>

        <Box sx={{ position: "relative", width: 1 }}>
          <Button
            variant={purchasedUnlock ? "secondary" : "primary"}
            size="md"
            className="w-full"
            onClick={() => onPrimaryAction(exam)}
          >
            {primaryLabel}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
});

const ExamOverviewModern = ({
  exams,
  examProgressById,
  showUserProgress,
  rscUserAccessSnapshot,
  loadExamProgressClientSide = false,
  timingLog = false,
}: {
  exams: TExamSchemaDto[];
  examProgressById: Record<string, ExamProgressSummary>;
  showUserProgress: boolean;
  /** Server snapshot from the page so purchased mocks render correctly before `useHybridWebUser()` loads. */
  rscUserAccessSnapshot?: { purchasedMockExamIds?: unknown };
  /** When true, completion bars load after exam cards via `/api/users/exam-overview-progress`. */
  loadExamProgressClientSide?: boolean;
  /** When true (dev or `EXAM_OVERVIEW_TIMING_LOG=1`), logs time from navigation start to exam list mount. */
  timingLog?: boolean;
}) => {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  /** Server snapshot from page RSC — keeps mock exam CTAs correct when client auth lags. */
  const serverSignedIn = Boolean(rscUserAccessSnapshot && showUserProgress);
  const effectiveSignedIn =
    isSignedIn || (!isForceSignedOut() && serverSignedIn);
  const noUser = isLoaded ? !effectiveSignedIn : !serverSignedIn;
  const plan = user?.publicMetadata?.plan as string | undefined;
  const purchaseDate = user?.publicMetadata?.purchaseDate as
    | string
    | undefined;
  const fromClient = user?.publicMetadata?.purchasedMockExamIds;
  const purchasedMockExamIds =
    fromClient !== undefined && fromClient !== null
      ? fromClient
      : rscUserAccessSnapshot?.purchasedMockExamIds;

  const signedInFreeUser =
    effectiveSignedIn &&
    (!plan || normalizePlan(plan) === "free");
  /** Catalog first ready exam (by `order`), not list position — list may put purchased mocks first. */
  const firstReadyExamId = useMemo(() => {
    if (exams.length === 0) return null;
    let best = exams[0];
    for (let i = 1; i < exams.length; i++) {
      const e = exams[i];
      const bo = best.order ?? 0;
      const eo = e.order ?? 0;
      if (eo < bo) {
        best = e;
      } else if (eo === bo) {
        const bid = normalizeMockExamIdForAccess(best.id) ?? String(best.id);
        const eid = normalizeMockExamIdForAccess(e.id) ?? String(e.id);
        if (eid.localeCompare(bid, undefined, { sensitivity: "base" }) < 0) {
          best = e;
        }
      }
    }
    return best.id;
  }, [exams]);
  const mockExamUnlocked = useCallback(
    (exam: TExamSchemaDto) =>
      Boolean(
        effectiveSignedIn &&
          hasMockExamAccess(
            plan,
            purchaseDate,
            exam.id,
            firstReadyExamId,
            purchasedMockExamIds
          )
      ),
    [
      effectiveSignedIn,
      plan,
      purchaseDate,
      firstReadyExamId,
      purchasedMockExamIds,
    ]
  );
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [progressById, setProgressById] = useState<
    Record<string, ExamProgressSummary>
  >(() => ({ ...examProgressById }));
  const [examProgressReady, setExamProgressReady] = useState(
    () => !loadExamProgressClientSide
  );

  const examIdsKey = useMemo(() => exams.map((e) => e.id).join(","), [exams]);

  const { setSelectedExam } = useSelectedExam();

  useEffect(() => {
    if (loadExamProgressClientSide) {
      return;
    }
    setProgressById({ ...examProgressById });
    setExamProgressReady(true);
  }, [loadExamProgressClientSide, examProgressById]);

  useEffect(() => {
    if (!timingLog || exams.length === 0) {
      return;
    }
    const msSinceNavStart =
      typeof performance !== "undefined" ? performance.now() : 0;
    console.log("[exam-overview/timing] client exams mounted", {
      msSinceNavigationStart: +msSinceNavStart.toFixed(1),
      examCount: exams.length,
    });
  }, [timingLog, exams.length]);

  useEffect(() => {
    if (!loadExamProgressClientSide || !showUserProgress || examIdsKey.length === 0) {
      return;
    }
    let cancelled = false;
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;

    const loadProgress = async () => {
      try {
        const examIds = exams.map((e) => e.id);
        const res = await fetch("/api/users/exam-overview-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examIds }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          examProgressById?: Record<string, ExamProgressSummary>;
        };
        if (cancelled) return;
        if (res.ok && data.examProgressById) {
          startTransition(() => {
            setProgressById(data.examProgressById!);
          });
        }
        if (timingLog && typeof performance !== "undefined") {
          console.log("[exam-overview/timing] client progress loaded", {
            ms: +(performance.now() - t0).toFixed(1),
            ok: res.ok,
          });
        }
      } finally {
        if (!cancelled) {
          setExamProgressReady(true);
        }
      }
    };

    const cancelIdle = scheduleIdleTask(() => {
      if (!cancelled) {
        void loadProgress();
      }
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [
    loadExamProgressClientSide,
    showUserProgress,
    examIdsKey,
    exams,
    timingLog,
  ]);

  const navigateToExamPart = useCallback(
    (exam: TExamSchemaDto, partId: number, section?: string) => {
      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const query = section
        ? `?section=${section}&attemptId=${attemptId}`
        : `?attemptId=${attemptId}`;
      const href = `/exams/exam_${exam.id}/part${partId}${query}`;
      startTransition(() => {
        setSelectedExam(exam.name);
        router.push(href);
      });
    },
    [router, setSelectedExam]
  );

  const handleSectionStart = useCallback(
    (exam: TExamSchemaDto, partId: number, section?: string) => {
      if (!mockExamUnlocked(exam)) {
        return;
      }
      navigateToExamPart(exam, partId, section);
    },
    [mockExamUnlocked, navigateToExamPart]
  );

  const handlePrimaryAction = useCallback(
    (exam: TExamSchemaDto) => {
      if (signedInFreeUser && mockExamUnlocked(exam)) {
        navigateToExamPart(exam, 1);
        return;
      }
      if (noUser) {
        setShowLoginModal(true);
        return;
      }
      if (signedInFreeUser) {
        startTransition(() => {
          router.push("/pricing");
        });
        return;
      }
      navigateToExamPart(exam, 1);
    },
    [
      signedInFreeUser,
      mockExamUnlocked,
      noUser,
      navigateToExamPart,
      router,
    ]
  );

  return (
    <>
      {noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            pb: 1,
          }}
        >
          {exams.map((exam: TExamSchemaDto) => {
            const progress = progressById[exam.id];
            const unlocked = mockExamUnlocked(exam);
            const purchasedUnlock = isMockExamUnlockedViaPurchase(
              exam.id,
              purchasedMockExamIds
            );
            const isFreeMockExam =
              firstReadyExamId != null &&
              (normalizeMockExamIdForAccess(exam.id) ?? String(exam.id)) ===
                (normalizeMockExamIdForAccess(firstReadyExamId) ??
                  String(firstReadyExamId));
            const primaryLabel = signedInFreeUser
              ? mockExamUnlocked(exam)
                ? "Start Practice"
                : "View plans"
              : noUser
                ? "Get started"
                : "Start Test";

            return (
              <ExamOverviewCard
                key={exam.id}
                exam={exam}
                unlocked={unlocked}
                purchasedUnlock={purchasedUnlock}
                isFreeMockExam={isFreeMockExam}
                showUserProgress={showUserProgress}
                loadExamProgressClientSide={loadExamProgressClientSide}
                examProgressReady={examProgressReady}
                progress={progress}
                primaryLabel={primaryLabel}
                onSectionStart={handleSectionStart}
                onPrimaryAction={handlePrimaryAction}
              />
            );
          })}
        </Box>
      </Box>
    </>
  );
};

const ExamOverview = (props: Parameters<typeof ExamOverviewModern>[0]) => {
  const variant = useUiVariant();
  if (variant === "classic") {
    return (
      <ExamOverviewClassic
        exams={props.exams}
        showUserProgress={props.showUserProgress}
        rscUserAccessSnapshot={props.rscUserAccessSnapshot}
      />
    );
  }
  return <ExamOverviewModern {...props} />;
};

export default ExamOverview;
