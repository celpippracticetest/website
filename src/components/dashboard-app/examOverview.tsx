"use client";

import { TExamSchemaDto } from "@/models/exam.model";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useUser } from "@clerk/nextjs";
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "nextjs-toploader/app";
import { useState } from "react";
import LoginModal from "../modal/LoginModal";
import UpgradeModal from "../modal/UpgradeModal";

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
  const freeUser = user?.publicMetadata.plan == "free";
  const noUser = isLoaded ? !isSignedIn : false;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { setSelectedExam } = useSelectedExam();

  const handleStart = (
    exam: TExamSchemaDto,
    partId: number = 1,
    section?: string
  ) => {
    if (freeUser) {
      setShowUpgradeModal(true);
      return;
    } else if (noUser) {
      setShowLoginModal(true);
      return;
    }
    setSelectedExam(exam.name);
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const query = section ? `?section=${section}&attemptId=${attemptId}` : `?attemptId=${attemptId}`;
    router.push(`/exams/exam_${exam.id}/part${partId}${query}`);
  };

  return (
    <>
      {freeUser ? (
        showUpgradeModal && <UpgradeModal setShowModal={setShowUpgradeModal} />
      ) : noUser ? (
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
            const progress = examProgressById[exam.id];

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
                          onClick={() => handleStart(exam, skill.partId, skill.section)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "calc(50% - 4px)",
                            minHeight: 38,
                            cursor: "pointer",
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
                            transition:
                              "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
                            "&:hover": {
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
                    onClick={() => handleStart(exam, 1)}
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
                    Start Full Test
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
