"use client";

import { TExamSchemaDto } from "@/models/exam.model";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useMemo, useState } from "react";
import LoginModal from "../modal/LoginModal";
import {
  hasMockExamAccess,
  hasPaidPracticeAccess,
  isMockExamUnlockedViaPurchase,
  normalizeMockExamIdForAccess,
  normalizePlan,
} from "@/lib/subscriptionAccess";
import type { ExamProgressSummary } from "@/lib/examOverviewProgress";

const examCardNavy = "#1B2B5A";
const examPrimaryGradient =
  "linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #3B82F6 100%)";

const examSections = [
  { label: "Listening", partId: 1, section: "listening" },
  { label: "Reading", partId: 7, section: "reading" },
  { label: "Writing", partId: 11, section: "writing" },
  { label: "Speaking", partId: 13, section: "speaking" },
];

const ExamOverview = ({
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
  const noUser = isLoaded ? !isSignedIn : false;
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
    isLoaded &&
    isSignedIn &&
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
  /** Before `useHybridWebUser()` is ready, trust the server snapshot when present (avoids false "Buy" on first paint). */
  const effectiveSignedIn = !isLoaded
    ? Boolean(rscUserAccessSnapshot && showUserProgress)
    : isSignedIn;
  const mockExamUnlocked = (exam: TExamSchemaDto) =>
    Boolean(
      effectiveSignedIn &&
        hasMockExamAccess(
          plan,
          purchaseDate,
          exam.id,
          firstReadyExamId,
          purchasedMockExamIds
        )
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
    (async () => {
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
          setProgressById(data.examProgressById);
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
    })();
    return () => {
      cancelled = true;
    };
  }, [
    loadExamProgressClientSide,
    showUserProgress,
    examIdsKey,
    exams,
    timingLog,
  ]);

  const navigateToExamPart = (
    exam: TExamSchemaDto,
    partId: number,
    section?: string
  ) => {
    setSelectedExam(exam.name);
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const query = section
      ? `?section=${section}&attemptId=${attemptId}`
      : `?attemptId=${attemptId}`;
    router.push(`/exams/exam_${exam.id}/part${partId}${query}`);
  };

  const handleSectionStart = (
    exam: TExamSchemaDto,
    partId: number,
    section?: string
  ) => {
    if (!mockExamUnlocked(exam)) {
      return;
    }
    navigateToExamPart(exam, partId, section);
  };

  const handlePrimaryAction = (exam: TExamSchemaDto) => {
    if (!isLoaded) {
      return;
    }
    if (signedInFreeUser && mockExamUnlocked(exam)) {
      navigateToExamPart(exam, 1);
      return;
    }
    if (noUser) {
      setShowLoginModal(true);
      return;
    }
    if (signedInFreeUser) {
      router.push("/pricing");
      return;
    }
    navigateToExamPart(exam, 1);
  };

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
          {exams.map((exam: TExamSchemaDto, i: number) => {
            const progress = progressById[exam.id];
            const unlocked = mockExamUnlocked(exam);
            const purchasedUnlock = isMockExamUnlockedViaPurchase(
              exam.id,
              purchasedMockExamIds
            );

            return (
              <Paper
                key={`${exam.id}-${i}`}
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
                  transition:
                    "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
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
                          onClick={() =>
                            handleSectionStart(
                              exam,
                              skill.partId,
                              skill.section
                            )
                          }
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
                            backgroundColor: "#F8FAFC",
                            color: "#475569",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textAlign: "center",
                            border: "1px solid #E2E8F0",
                            opacity: unlocked ? 1 : 0.45,
                            transition:
                              "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, opacity 0.2s ease",
                            "&:hover:not(:disabled)": {
                              backgroundColor: "#EFF6FF",
                              borderColor: "#93C5FD",
                              color: "#1D4ED8",
                            },
                            "&:focus-visible": {
                              borderColor: "#2563EB",
                              boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.22)",
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
                      variant="contained"
                      disabled={!isLoaded}
                      onClick={() => handlePrimaryAction(exam)}
                      fullWidth
                      sx={{
                        minHeight: 48,
                        borderRadius: "999px",
                        textTransform: "none",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        boxShadow: "none",
                        ...(purchasedUnlock
                          ? {
                              backgroundColor: "#EA580C",
                              color: "#FFFFFF",
                              "&:hover": {
                                backgroundColor: "#C2410C",
                                boxShadow: "none",
                              },
                              "&.Mui-disabled": {
                                backgroundColor: "rgba(234, 88, 12, 0.45)",
                                color: "#FFFFFF",
                              },
                            }
                          : {
                              background: examPrimaryGradient,
                              color: "#FFFFFF",
                              "&:hover": {
                                opacity: 0.96,
                                boxShadow: "none",
                              },
                              "&.Mui-disabled": {
                                background:
                                  "linear-gradient(135deg, rgba(30, 58, 138, 0.45), rgba(59, 130, 246, 0.45))",
                                color: "#FFFFFF",
                              },
                            }),
                      }}
                    >
                      {signedInFreeUser
                        ? mockExamUnlocked(exam)
                          ? "Start Practice"
                          : "View plans"
                        : noUser
                          ? "Sign in"
                          : "Start Full Test"}
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      </Box>
    </>
  );
};

export default ExamOverview;
