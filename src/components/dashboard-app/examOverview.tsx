"use client";

import { TExamSchemaDto } from "@/models/exam.model";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useUser } from "@clerk/nextjs";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "nextjs-toploader/app";
import { useState } from "react";
import LoginModal from "../modal/LoginModal";
import {
  hasMockExamAccess,
  hasPaidPracticeAccess,
  hasPremiumPlusAccess,
  normalizePlan,
} from "@/lib/subscriptionAccess";

const examSections = [
  { label: "Listening", partId: 1, section: "listening" },
  { label: "Reading", partId: 7, section: "reading" },
  { label: "Writing", partId: 11, section: "writing" },
  { label: "Speaking", partId: 13, section: "speaking" },
];

type ExamProgressSummary = {
  completedParts: number;
  totalParts: number;
  completionPercentage: number;
};

const ExamOverview = ({
  exams,
  examProgressById,
  showUserProgress,
}: {
  exams: TExamSchemaDto[];
  examProgressById: Record<string, ExamProgressSummary>;
  showUserProgress: boolean;
}) => {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const noUser = isLoaded ? !isSignedIn : false;
  const plan = user?.publicMetadata?.plan as string | undefined;
  const purchaseDate = user?.publicMetadata?.purchaseDate as
    | string
    | undefined;
  const purchasedMockExamIds = user?.publicMetadata?.purchasedMockExamIds;
  const signedInFreeUser =
    isLoaded &&
    isSignedIn &&
    (!plan || normalizePlan(plan) === "free");
  const firstReadyExamId = exams[0]?.id ?? null;
  const mockExamUnlocked = (exam: TExamSchemaDto) =>
    Boolean(
      isLoaded &&
        isSignedIn &&
        hasMockExamAccess(
          plan,
          purchaseDate,
          exam.id,
          firstReadyExamId,
          purchasedMockExamIds
        )
    );
  const needsPremiumPlusUpgrade =
    isLoaded &&
    isSignedIn &&
    hasPaidPracticeAccess(plan, purchaseDate) &&
    !hasPremiumPlusAccess(plan, purchaseDate);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);
  const [mockBuySubmittingExamId, setMockBuySubmittingExamId] = useState<
    string | null
  >(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const mockExamPrice = "$4.99";
  const mockCheckoutPriceId = process.env.NEXT_PUBLIC_STRIPE_MOCK_EXAM_PRICE_ID;

  const { setSelectedExam } = useSelectedExam();

  const runPremiumPlusUpgrade = async () => {
    if (upgradeSubmitting || !needsPremiumPlusUpgrade) {
      return;
    }
    setUpgradeError(null);
    setUpgradeSubmitting(true);
    try {
      const res = await fetch("/api/users/upgrade-to-premium-plus", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not upgrade your plan.");
      }
      await user?.reload();
      if (typeof (router as { refresh?: () => void }).refresh === "function") {
        (router as { refresh: () => void }).refresh();
      }
    } catch (e) {
      setUpgradeError(
        e instanceof Error ? e.message : "Could not upgrade your plan."
      );
    } finally {
      setUpgradeSubmitting(false);
    }
  };

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
    if (noUser || signedInFreeUser) {
      if (!mockCheckoutPriceId) {
        setUpgradeError("Mock checkout is not configured. Please contact support.");
        return;
      }
      const checkoutBase = noUser
        ? "/api/checkout_session/guest"
        : "/api/checkout_session";
      const checkoutUrl = new URL(checkoutBase, window.location.origin);
      checkoutUrl.searchParams.set("price", mockCheckoutPriceId);
      checkoutUrl.searchParams.set("purchase_type", "mock_exam");
      checkoutUrl.searchParams.set("mock_exam_id", exam.id);
      setMockBuySubmittingExamId(exam.id);
      window.location.href = checkoutUrl.toString();
      return;
    }
    if (needsPremiumPlusUpgrade) {
      if (exam.id === firstReadyExamId) {
        navigateToExamPart(exam, 1);
        return;
      }
      void runPremiumPlusUpgrade();
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
        {needsPremiumPlusUpgrade && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: "20px",
              border: "1px solid #C7D6F8",
              background:
                "linear-gradient(135deg, rgba(74, 125, 255, 0.12), rgba(13, 170, 148, 0.08))",
            }}
          >
            <Stack spacing={1.5}>
              <Typography
                sx={{
                  fontSize: { xs: "1rem", sm: "1.05rem" },
                  fontWeight: 700,
                  color: "#2F3A4C",
                }}
              >
                Upgrade account for mock exams
              </Typography>
              <Typography sx={{ fontSize: "0.9rem", color: "#5A6678" }}>
                Your Premium plan includes practice and one full mock exam (the
                first test in this list). Unlock every mock exam with Premium
                Plus. Upgrade keeps the same billing period—you only pay the
                prorated difference.
              </Typography>
              {upgradeError && (
                <Alert severity="error" onClose={() => setUpgradeError(null)}>
                  {upgradeError}
                </Alert>
              )}
              <Box>
                <Button
                  variant="contained"
                  disabled={upgradeSubmitting}
                  onClick={() => void runPremiumPlusUpgrade()}
                  sx={{
                    minHeight: 44,
                    borderRadius: "999px",
                    textTransform: "none",
                    fontWeight: 700,
                    px: 3,
                    backgroundColor: "#4A7DFF",
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor: "#3A6DEB",
                      boxShadow: "none",
                    },
                  }}
                >
                  {upgradeSubmitting ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    "Upgrade"
                  )}
                </Button>
              </Box>
            </Stack>
          </Paper>
        )}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            pb: 1,
          }}
        >
          {exams.map((exam: TExamSchemaDto, i: number) => {
            const progress = examProgressById[exam.id];
            const unlocked = mockExamUnlocked(exam);

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
                  border: "1px solid #E3EAF5",
                  overflow: "hidden",
                  backgroundColor: "#FFFFFF",
                  transition:
                    "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 20px 40px rgba(55, 70, 92, 0.10)",
                    borderColor: "#C7D6F8",
                  },
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(135deg, rgba(74, 125, 255, 0.10), rgba(13, 170, 148, 0.05))",
                    opacity: 0.9,
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
                        fontWeight: 700,
                        color: "#37465C",
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
                            backgroundColor: "#F7F9FC",
                            color: "#5A6678",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textAlign: "center",
                            border: "1px solid #E6ECF5",
                            opacity: unlocked ? 1 : 0.45,
                            transition:
                              "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, opacity 0.2s ease",
                            "&:hover:not(:disabled)": {
                              backgroundColor: "#EEF4FF",
                              borderColor: "#BFD1FF",
                              color: "#2F5FD7",
                            },
                            "&:focus-visible": {
                              borderColor: "#4A7DFF",
                              boxShadow: "0 0 0 3px rgba(74, 125, 255, 0.18)",
                            },
                          }}
                        >
                          {skill.label}
                        </Box>
                      ))}
                    </Box>

                    {showUserProgress && progress && progress.completionPercentage > 0 && (
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
                              color: "#5A6678",
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
                                  ? "#0DAA94"
                                  : "#4A7DFF",
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
                            backgroundColor: "#E7EEF8",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: "999px",
                              background:
                                progress.completionPercentage === 100
                                  ? "linear-gradient(90deg, #0DAA94, #08C3A6)"
                                  : "linear-gradient(90deg, #4A7DFF, #7AA1FF)",
                            },
                          }}
                        />
                      </Stack>
                    )}
                  </Stack>

                  <Button
                    variant="contained"
                    disabled={
                      !isLoaded ||
                      mockBuySubmittingExamId === exam.id ||
                      (needsPremiumPlusUpgrade &&
                        exam.id !== firstReadyExamId &&
                        upgradeSubmitting)
                    }
                    onClick={() => handlePrimaryAction(exam)}
                    sx={{
                      minHeight: 48,
                      borderRadius: "999px",
                      textTransform: "none",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      boxShadow: "none",
                      backgroundColor: "#4A7DFF",
                      "&:hover": {
                        backgroundColor: "#3A6DEB",
                        boxShadow: "none",
                      },
                    }}
                  >
                    {signedInFreeUser
                      ? mockBuySubmittingExamId === exam.id
                        ? "Redirecting…"
                        : `Buy for ${mockExamPrice}`
                      : noUser
                        ? mockBuySubmittingExamId === exam.id
                          ? "Redirecting…"
                          : `Buy for ${mockExamPrice}`
                      : needsPremiumPlusUpgrade
                        ? exam.id === firstReadyExamId
                          ? "Start Full Test"
                          : upgradeSubmitting
                            ? "Upgrading…"
                            : "Upgrade"
                        : "Start Full Test"}
                  </Button>
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
