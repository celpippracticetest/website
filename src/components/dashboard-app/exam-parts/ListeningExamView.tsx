"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AudioPlayer from "../listening-practice/components/AudioPlayer";
import ListeningQuestionList from "../listening-practice/components/ListeningQuestionList";
import { TPracticeDto } from "@/models/practice.model";
import { useRouter } from "nextjs-toploader/app";
import { useSearchParams } from "next/navigation";
import ListeningDropDownQuestionList from "../listening-practice/components/ListeningDropDownQuestionList";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { ActivityLogger } from "@/lib/userActivity";
import { runMockSubmitSideEffects } from "@/lib/mockSubmitSideEffects";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";
import { PRACTICE_PARTS } from "@/constants";
import ContinueExamModal from "@/components/modal/ContinueExamModal";
import ExamHeader from "./components/ExamHeader";
import PracticeExamCardHeader from "./components/PracticeExamCardHeader";
import {
  hasMockExamAccess,
  hasPremiumPlusAccess,
} from "@/lib/subscriptionAccess";
import { formatOfficialTimeRemaining } from "./components/officialTimerText";
import ListeningOfficialView from "./components/official/ListeningOfficialView";
import {
  buildOfficialExamTitle,
  OfficialStatusText,
  officialFontFamily,
} from "./components/official/shared";
import {
  useExamViewMode,
  type MockExamViewMode,
} from "./components/useExamViewMode";
import {
  createMockPracticeSections,
  getMockExamPartsForSection,
  type PracticeSectionItem,
} from "./mockExamShared";
import {
  mockExamSectionResultsHref,
  sanitizeMockExamAttemptIdParam,
} from "@/lib/mockExamAttemptId";

interface ListeningExamViewProps {
  practice: TPracticeDto;
  partId: number;
  examId: string;
  partNumber: string;
  examName?: string;
  examNumber?: number;
  hideHeader?: boolean;
  viewMode?: MockExamViewMode;
  setViewMode?: (mode: MockExamViewMode) => void;
  practiceSections?: PracticeSectionItem[];
  getPartsForSection?: (route: string) => { title: string; index: number }[];
  firstReadyExamId?: string | null;
}

type ListeningPage =
  | "description"
  | "instructions"
  | "transition"
  | "problem"
  | "question"
  | "answer";

const betweenSectionCountdownSeconds = 10;
const sectionOrdinalLabels = ["first section", "second section", "third section"];

const taskTimesByPart: Record<number, number> = {
  4: 180,
  5: 240,
  6: 270,
};

const formatTime = (value: number) => {
  if (value <= 0) {
    return "Time's Up!";
  }

  return `${Math.floor(value / 60)}:${value % 60 < 10 ? `0${value % 60}` : value % 60}`;
};

const ListeningExamView = (props: ListeningExamViewProps) => {
  const {
    practice,
    partId,
    examId,
    examName,
    examNumber,
    hideHeader = false,
    viewMode,
    setViewMode,
    practiceSections,
    getPartsForSection,
    firstReadyExamId,
  } = props;

  const router = useRouter();
  const { user, isLoaded } = useHybridWebUser();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const attemptId = sanitizeMockExamAttemptIdParam(searchParams.get("attemptId"));
  const { addPoints } = useLeaguePoints();
  const {
    isModalOpen,
    currentTrophy,
    userPoints,
    timeSpent,
    closeTrophy,
    checkTrophyAchievements,
  } = useTrophySystem();

  const [page, setPage] = useState<ListeningPage>("description");
  const [passageIndex, setPassageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionIndexInPractice, setQuestionIndexInPractice] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [time, setTime] = useState(taskTimesByPart[partId] ?? 30);
  const [transitionCountdown, setTransitionCountdown] = useState(
    betweenSectionCountdownSeconds
  );
  const [showModal, setShowModal] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const localExamViewMode = useExamViewMode();
  const resolvedViewMode = viewMode ?? localExamViewMode.viewMode;
  const isOfficialMode = resolvedViewMode === "official";
  const resolvedSetViewMode = setViewMode ?? localExamViewMode.setViewMode;
  const resolvedPracticeSections =
    practiceSections ?? createMockPracticeSections();
  const resolvedGetPartsForSection =
    getPartsForSection ?? getMockExamPartsForSection;

  const ref = useRef<HTMLDivElement>(null);
  /** True only after answers are successfully persisted (avoids navigating away on failed save). */
  const examAnswerPersistDoneRef = useRef(false);
  const examAnswerPersistInFlightRef = useRef(false);
  const officialAutoAdvanceTriggeredRef = useRef(false);
  const [listenPersistError, setListenPersistError] = useState<string | null>(null);
  const [listenPersistRetryNonce, setListenPersistRetryNonce] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (page === "question" && time > 0) {
      timer = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isOfficialMode && page === "transition" && transitionCountdown > 0) {
      timer = setInterval(() => {
        setTransitionCountdown((prevTime) => prevTime - 1);
      }, 1000);
    }

    if (time === 0 && timer) {
      clearInterval(timer);
      // Handle time's up logic here if needed
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isOfficialMode, page, time, transitionCountdown]);

  useEffect(() => {
    if (!isOfficialMode || page !== "question" || time > 0) {
      officialAutoAdvanceTriggeredRef.current = false;
      return;
    }

    if (officialAutoAdvanceTriggeredRef.current) {
      return;
    }

    officialAutoAdvanceTriggeredRef.current = true;
    handleNext();
  }, [isOfficialMode, page, time]);

  useEffect(() => {
    if (!isOfficialMode || page !== "transition" || transitionCountdown > 0) {
      return;
    }

    setTransitionCountdown(betweenSectionCountdownSeconds);
    setPage("problem");
  }, [isOfficialMode, page, transitionCountdown]);

  useEffect(() => {
    // Log mock exam started when component mounts
    if (user && practice.taskId) {
      const loggerAttemptId = attemptId || `mock_${practice.taskId}_${Date.now()}`;
      ActivityLogger.mockStarted(loggerAttemptId, practice.taskId.toString());
    }
  }, [user, practice.taskId, searchParams]);

  useEffect(() => {
    examAnswerPersistDoneRef.current = false;
    setListenPersistError(null);
  }, [partId, practice.taskId]);

  useEffect(() => {
    if (page !== "answer" || !user) {
      return;
    }
    if (examAnswerPersistDoneRef.current || examAnswerPersistInFlightRef.current) {
      return;
    }

    examAnswerPersistInFlightRef.current = true;
    setListenPersistError(null);

    const submitAnswers = async () => {
      try {
        const response = await fetch("/api/exams/answers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            examId: practice.taskId,
            partId: partId,
            answers: selectedAnswers,
            attemptId,
          }),
        });

        if (!response.ok) {
          console.error("Exam listening save failed:", response.status);
          setListenPersistError(
            "We could not save your answers yet. Check your connection, then tap Try again."
          );
          return;
        }

        const result = await response.json();
        const loggerAttemptId = attemptId || `mock_${practice.taskId}_${Date.now()}`;

        examAnswerPersistDoneRef.current = true;

        runMockSubmitSideEffects({
          attemptId: loggerAttemptId,
          examId: practice.taskId.toString(),
          overallScore: result.overall,
          result,
          durationSeconds: time,
          section,
          addPoints,
          checkTrophyAchievements,
        });

        if (section === "listening" && partId >= 6) {
          setShowContinueModal(true);
          return;
        }

        const params = new URLSearchParams();
        if (section) params.set("section", section);
        if (attemptId) params.set("attemptId", attemptId);
        const query = params.toString() ? `?${params.toString()}` : "";

        router.push(
          `/exams/exam_${practice.taskId}/part${(partId + 1).toString()}${query}`
        );
      } catch (error) {
        console.error("Failed to submit answers:", error);
        setListenPersistError(
          "We could not save your answers yet. Check your connection, then tap Try again."
        );
      } finally {
        examAnswerPersistInFlightRef.current = false;
      }
    };

    void submitAnswers();
  }, [
    addPoints,
    attemptId,
    checkTrophyAchievements,
    listenPersistRetryNonce,
    page,
    partId,
    practice.taskId,
    router,
    section,
    selectedAnswers,
    time,
    user,
  ]);

  const handleAnswerSelect = (questionId: number, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId - 1]: answerId,
    }));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const resolvedExamId = examId ?? practice.taskId;
    const canAccess = hideHeader
      ? hasMockExamAccess(
          user?.publicMetadata.plan as string | undefined,
          user?.publicMetadata.purchaseDate,
          resolvedExamId,
          firstReadyExamId ?? null,
          user?.publicMetadata?.purchasedMockExamIds
        )
      : hasPremiumPlusAccess(
          user?.publicMetadata.plan as string | undefined,
          user?.publicMetadata.purchaseDate as string | undefined
        );
    if (isLoaded && (!user || !canAccess)) {
      router.push("/exam-overview");
    }
  }, [
    examId,
    firstReadyExamId,
    hideHeader,
    isLoaded,
    practice.taskId,
    router,
    user,
  ]);

  const currentPassage = practice.passages[passageIndex];
  const isMultiQuestionPart = [4, 5, 6].includes(partId);
  const questionTimer = taskTimesByPart[partId] ?? 30;
  const transitionSectionLabel =
    sectionOrdinalLabels[passageIndex] ?? `section ${passageIndex + 1}`;
  const listeningPartTitle = `Listening Part ${partId}: ${
    PRACTICE_PARTS[partId - 1] ?? "Listening"
  }`;
  const officialFrameTitle = buildOfficialExamTitle(
    examName ?? practice.name,
    `Practice Test ${examNumber ?? ""}`.trim() || "Practice Test",
    page === "problem" || page === "question" || page === "transition"
      ? listeningPartTitle
      : "Listening Test"
  );

  const buildCurrentQuery = () => {
    const params = new URLSearchParams();
    if (section) params.set("section", section);
    if (attemptId) params.set("attemptId", attemptId);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const buildReadingSectionQuery = () => {
    const params = new URLSearchParams();
    params.set("section", "reading");
    if (attemptId) params.set("attemptId", attemptId);
    return `?${params.toString()}`;
  };

  const resetTimer = () => {
    setTime(questionTimer);
  };

  const handleBack = () => {
    const query = buildCurrentQuery();

    if (page === "description" && passageIndex === 0) {
      if (partId === 1) {
        router.push("/exam-overview");
      } else {
        router.push(`/exams/exam_${practice.taskId}/part${(partId - 1).toString()}${query}`);
      }
    } else if (page === "instructions" && passageIndex === 0) {
      setPage("description");
    } else if (page === "transition" && passageIndex > 0) {
      setPage("question");
      setPassageIndex(passageIndex - 1);
      setQuestionIndex(
        (practice.passages[passageIndex - 1]?.questions?.length || 1) - 1
      );
      setQuestionIndexInPractice(questionIndexInPractice - 1);
      setTransitionCountdown(betweenSectionCountdownSeconds);
    } else if (page === "problem" && passageIndex === 0) {
      setPage("instructions");
    } else if (page === "problem" && passageIndex > 0) {
      setPage("question");
      setPassageIndex(passageIndex - 1);
      setQuestionIndex((practice.passages[passageIndex - 1]?.questions?.length || 1) - 1);
    } else if (page === "question" && questionIndex > 0) {
      setQuestionIndex(questionIndex - 1);
      setQuestionIndexInPractice(questionIndexInPractice - 1);
    } else if (page === "question" && questionIndex === 0) {
      setPage("problem");
      setQuestionIndex(0);
      setQuestionIndexInPractice(questionIndexInPractice - 1);
    }

    resetTimer();
  };

  const handleNext = () => {
    if (page === "description") {
      setPage("instructions");
      setQuestionIndex(0);
    } else if (page === "instructions" && passageIndex === 0) {
      setPage("problem");
      setQuestionIndex(0);
    } else if (page === "problem") {
      setPage("question");
      setQuestionIndexInPractice(questionIndexInPractice + 1);
    } else if (
      page === "question" &&
      questionIndex < (practice.passages[passageIndex]?.questions?.length || 0) - 1 &&
      !isMultiQuestionPart
    ) {
      setQuestionIndex(questionIndex + 1);
      setQuestionIndexInPractice(questionIndexInPractice + 1);
    } else if (
      page === "question" &&
      passageIndex < practice.passages.length - 1
    ) {
      setPassageIndex(passageIndex + 1);
      setQuestionIndex(0);
      if (isOfficialMode) {
        setTransitionCountdown(betweenSectionCountdownSeconds);
        setPage("transition");
      } else {
        setPage("problem");
      }
    } else if (page === "question") {
      setPage("answer");
    }

    resetTimer();
  };

  const descriptionItems = [
    "You'll listen to a conversation divided into three parts.",
    "After each part, you'll be asked two or three questions. The questions will be played only once.",
    "Select the most appropriate answer for each question.",
  ];

  const officialStatusSlot =
    page === "problem" || page === "question" ? (
      <OfficialStatusText>
        {page === "question"
          ? formatOfficialTimeRemaining(time)
          : ""}
      </OfficialStatusText>
    ) : null;

  return (
    <>
      {!hideHeader && (
        <ExamHeader
          examPractice="Listening"
          ref={ref}
          setShowModal={setShowModal}
          menuShowModal={showModal}
          examId={practice.taskId}
          partId={partId}
          examName={examName ?? practice.name}
          examNumber={examNumber}
          practiceSections={resolvedPracticeSections}
          getPartsForSection={resolvedGetPartsForSection}
          viewMode={resolvedViewMode}
          setViewMode={resolvedSetViewMode}
        />
      )}

      {isOfficialMode ? (
        <ListeningOfficialView
          title={officialFrameTitle}
          page={page}
          practice={practice}
          currentPassage={currentPassage}
          questionIndex={questionIndex}
          questionIndexInPractice={questionIndexInPractice}
          isMultiQuestionPart={isMultiQuestionPart}
          selectedAnswers={selectedAnswers}
          descriptionItems={descriptionItems}
          transitionSectionLabel={transitionSectionLabel}
          transitionCountdown={transitionCountdown}
          onAnswerSelect={handleAnswerSelect}
          primaryActionLabel={
            page === "answer" || page === "transition" ? undefined : "Next"
          }
          onPrimaryAction={
            page === "answer" || page === "transition" ? undefined : handleNext
          }
          primaryActionDisabled={page === "answer" || page === "transition"}
          onBack={handleBack}
          backDisabled={page === "answer" || page === "transition"}
          statusSlot={officialStatusSlot}
        />
      ) : (
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            overflow: "hidden",
            borderRadius: "28px",
            border: "1px solid #DDE6F4",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 18px 44px rgba(55, 70, 92, 0.08)",
          }}
        >
        <PracticeExamCardHeader
          partTitle={PRACTICE_PARTS[partId - 1]}
          taskLabel={`Listening Task ${partId}`}
          onBack={handleBack}
          onNext={handleNext}
          backDisabled={page === "answer" || page === "transition"}
          nextDisabled={page === "answer" || page === "transition"}
          trailingSlot={
            page === "question" ? (
              <div className="min-w-[128px] rounded-full border border-error1/15 bg-error1/10 px-4 py-2 text-center font-body text-[15px] font-extrabold text-error1">
                {formatTime(time)}
              </div>
            ) : undefined
          }
        />

        <Box sx={{ minHeight: { xs: 480, xl: 620 } }}>
          {page === "answer" && (
            <Box
              sx={{
                minHeight: { xs: 420, md: 500 },
                px: 3,
                py: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F8FBFF",
              }}
            >
              {listenPersistError ? (
                <Stack spacing={2} alignItems="center" sx={{ maxWidth: 420, textAlign: "center" }}>
                  <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "#B42318" }}>
                    {listenPersistError}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => setListenPersistRetryNonce((n) => n + 1)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      backgroundColor: "#316BFF",
                      "&:hover": { backgroundColor: "#255CE0" },
                    }}
                  >
                    Try again
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2} alignItems="center">
                  <CircularProgress sx={{ color: "#316BFF" }} />
                  <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "#37465C" }}>
                    Saving your results...
                  </Typography>
                </Stack>
              )}
            </Box>
          )}

          {page === "description" && (
            <Stack spacing={2.5} sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "1.3rem", md: "1.55rem" },
                  fontWeight: 800,
                  color: "#212E42",
                }}
              >
                What is this part?
              </Typography>
              <Box
                component="ul"
                sx={{
                  m: 0,
                  pl: 2.75,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  color: "#415167",
                  "& li": {
                    lineHeight: 1.8,
                    fontSize: "1rem",
                  },
                  "& li::marker": {
                    color: "#316BFF",
                  },
                }}
              >
                {descriptionItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </Box>
            </Stack>
          )}

          {page === "instructions" && (
            <Stack spacing={2} sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                component="p"
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#8B97A8",
                }}
              >
                Instructions
              </Typography>
              <Stack spacing={1.5}>
                {practice.instructions?.map((instruction: string, index: number) => (
                  <Typography
                    key={index}
                    sx={{
                      fontSize: "1rem",
                      lineHeight: 1.85,
                      fontWeight: 500,
                      color: "#212E42",
                    }}
                  >
                    {instruction}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          )}

          {page === "problem" && (
            <Stack spacing={3} sx={{ p: { xs: 2.5, md: 4 } }}>
              <Typography
                component="p"
                sx={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#212E42",
                }}
              >
                Listen to the conversation. You will hear the conversation only once. It is about 1 to 1.5 minutes long.
              </Typography>

              <Box sx={{ width: "100%", maxWidth: "720px", mx: "auto" }}>
                <AudioPlayer audioUrl={currentPassage?.audioUrl} />

                <Stack spacing={2} sx={{ mt: 3, alignItems: "center" }}>
                  <Button
                    onClick={() => setIsOpen((prev) => !prev)}
                    variant="outlined"
                    sx={{
                      minWidth: "164px",
                      minHeight: "44px",
                      px: 2.25,
                      borderRadius: "999px",
                      textTransform: "none",
                      fontWeight: 700,
                      color: "#212E42",
                      borderColor: "#76808F",
                      backgroundColor: isOpen ? "#F2F6FF" : "#FFFFFF",
                      "&:hover": {
                        borderColor: "#5E6878",
                        backgroundColor: "#F2F6FF",
                      },
                    }}
                  >
                    {isOpen ? "Hide Transcript" : "Show Transcript"}
                  </Button>

                  <Collapse in={isOpen} sx={{ width: "100%" }}>
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: "18px",
                        border: "1px solid #D5DDE8",
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <Stack spacing={2} sx={{ p: { xs: 2, md: 2.5 } }}>
                        {currentPassage?.conversation?.map((con, index) => (
                          <Box key={`${con.name}-${index}`}>
                            <Box
                              component="span"
                              sx={{
                                display: "inline-block",
                                mr: 1,
                                mb: 0.75,
                                px: 1.25,
                                py: 0.75,
                                borderRadius: "10px",
                                backgroundColor: index % 2 === 0 ? "#FFEBD6" : "#D1DEFF",
                                fontSize: "0.9rem",
                                lineHeight: 1.2,
                                color: "#212E42",
                              }}
                            >
                              {con.name}:
                            </Box>
                            <Typography
                              component="span"
                              sx={{
                                fontSize: "0.96rem",
                                lineHeight: 1.8,
                                color: "#243244",
                              }}
                            >
                              {` ${con.text}`}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  </Collapse>
                </Stack>
              </Box>
            </Stack>
          )}

          {page === "question" && (
            <Box sx={{ pb: { xs: 4, md: 5 } }}>
              {isMultiQuestionPart ? (
                currentPassage?.questions?.map((question, index) => (
                  <ListeningDropDownQuestionList
                    key={index}
                    questionIndex={index + 1}
                    totalQuestions={practice.totalQuestion || 0}
                    question={question as any}
                    onAnswerSelect={handleAnswerSelect}
                    selectedAnswers={selectedAnswers}
                  />
                ))
              ) : (
                <ListeningQuestionList
                  questionIndex={questionIndexInPractice}
                  totalQuestions={practice.totalQuestion || 0}
                  question={currentPassage?.questions?.[questionIndex] as any}
                  onAnswerSelect={handleAnswerSelect}
                  selectedAnswers={selectedAnswers}
                />
              )}
            </Box>
          )}
        </Box>
        </Paper>
      )}

      {/* Trophy Modal */}
      <TrophyModal
        isOpen={isModalOpen}
        onClose={closeTrophy}
        trophy={currentTrophy}
        userPoints={userPoints}
        timeSpent={timeSpent}
      />
      {showContinueModal && (
        <ContinueExamModal
          completedSectionName="Listening"
          onViewResults={() => {
            setShowContinueModal(false);
            router.push(
              mockExamSectionResultsHref(
                String(practice.taskId),
                "listening",
                attemptId
              )
            );
          }}
          onContinue={() => {
            setShowContinueModal(false);
            router.push(
              `/exams/exam_${practice.taskId}/part7${buildReadingSectionQuery()}`
            );
          }}
          onFinish={() => {
            setShowContinueModal(false);
            router.push(`/exam-overview`);
          }}
          nextSectionName="Reading"
        />
      )}
    </>
  );
};

export default ListeningExamView;
