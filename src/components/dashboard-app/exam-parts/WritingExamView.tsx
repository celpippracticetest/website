"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Autorenew from "@mui/icons-material/Autorenew";
import { TPracticeDto } from "@/models/practice.model";
import { useRouter } from "nextjs-toploader/app";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import SvgArrowRight from "@/components/icons/ArrowRight";
import LoginModal from "@/components/modal/LoginModal";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgWritingPart from "@/components/icons/WritingPart";
import SvgReadingPart from "@/components/icons/ReadingPart";
import SvgListeningPart from "@/components/icons/ListeningPart";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
import { ActivityLogger } from "@/lib/userActivity";
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
import WritingOfficialView from "./components/official/WritingOfficialView";
import {
  buildOfficialExamTitle,
  OfficialStatusText,
} from "./components/official/shared";
import {
  useExamViewMode,
  type MockExamViewMode,
} from "./components/useExamViewMode";
import { Box, Typography } from "@mui/material";
import {
  createMockPracticeSections,
  getMockExamPartsForSection,
  type PracticeSectionItem,
} from "./mockExamShared";
import {
  mockExamSectionResultsHref,
  sanitizeMockExamAttemptIdParam,
} from "@/lib/mockExamAttemptId";

interface WritingExamViewProps {
  practice: TPracticeDto;
  partId: number;
  examId?: string;
  examName?: string;
  partNumber?: string;
  examNumber?: number;
  hideHeader?: boolean;
  viewMode?: MockExamViewMode;
  setViewMode?: (mode: MockExamViewMode) => void;
  practiceSections?: PracticeSectionItem[];
  getPartsForSection?: (route: string) => { title: string; index: number }[];
  firstReadyExamId?: string | null;
}

const formatTime = (value: number) => {
  if (value <= 0) {
    return "Time's Up!";
  }

  return `${Math.floor(value / 60)}:${value % 60 < 10 ? `0${value % 60}` : value % 60}`;
};

const WritingExamView = ({
  practice,
  partId,
  examId,
  examName,
  partNumber,
  examNumber,
  hideHeader = false,
  viewMode,
  setViewMode,
  practiceSections,
  getPartsForSection,
  firstReadyExamId,
}: WritingExamViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const browserAttemptId = sanitizeMockExamAttemptIdParam(searchParams.get("attemptId"));
  const [page, setPage] = useState(partId == 11 ? "description" : "question");
  const [passageIndex] = useState(0);
  const [time, setTime] = useState(1620);
  const [wordCount, setWordCount] = useState(0);
  const [progressBar, setProgressBar] = useState(0);
  const [isSubmit, setIsSubmit] = useState(false);
  const [text, setText] = useState("");
  const [tryToSubmit, setTryToSubmit] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  const { addPoints } = useLeaguePoints();
  const {
    isModalOpen,
    currentTrophy,
    userPoints,
    timeSpent,
    closeTrophy,
    checkTrophyAchievements,
  } = useTrophySystem();
  const freeUser = user?.publicMetadata.plan == "free";
  const noUser = isLoaded ? !isSignedIn : false;
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
  const officialAutoAdvanceTriggeredRef = useRef(false);
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (page === "question" && time > 0) {
      timer = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
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
  }, [page, time]);
  useEffect(() => {
    if (!isOfficialMode || page !== "question" || time > 0) {
      officialAutoAdvanceTriggeredRef.current = false;
      return;
    }

    if (officialAutoAdvanceTriggeredRef.current) {
      return;
    }

    officialAutoAdvanceTriggeredRef.current = true;
    handleHeaderNext();
  }, [isOfficialMode, page, time]);
  useEffect(() => {
    // Log mock exam started when component mounts
    if (user && practice.taskId) {
      const attemptId = browserAttemptId || `mock_${practice.taskId}_${Date.now()}`;
      ActivityLogger.mockStarted(attemptId, practice.taskId.toString());
    }
  }, [user, practice.taskId, browserAttemptId]);

  useEffect(() => {
    if (isSubmit) {
      submitAnswer();
    }
  }, [isSubmit]);

  const submitAnswer = async () => {
    try {
      setProgressBar(0); // Start loading
      const url = "/api/exams/answers/writing";
      const requestData = {
        examId: practice.taskId,
        partId,
        text,
        attemptId: browserAttemptId,
      };

      // Simulate progress bar increment
      const progressInterval = setInterval(() => {
        setProgressBar((prev) => (prev < 100 ? prev + 1 : prev));
      }, 300); // Increment every 300ms to reach 100 in ~30s

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error("Network response was not ok.");
        }
        setProgressBar(100);
        const result = await response.json();

        // Log mock exam part completed
        const attemptId = browserAttemptId || `mock_${practice.taskId}_${Date.now()}`;
        await ActivityLogger.mockCompleted(
          attemptId,
          practice.taskId.toString(),
          result.overall,
          result,
          time
        );

        // Add league points for mock exam completion
        await addPoints(20, "mockExams", `${Math.floor(time / 60)} minutes`);

        // Check for trophy achievements (only for complete exam mode)
        if (!section) {
          await checkTrophyAchievements(
            20,
            "mockExams",
            `${Math.floor(time / 60)}:${time % 60}`
          );
        }

        // Log AI feedback generation
        if (result.usage) {
          await ActivityLogger.aiFeedbackGenerated(
            "mock",
            "Writing",
            result.usage.prompt_tokens || 0,
            result.usage.completion_tokens || 0,
            attemptId
          );

          // Add league points for AI feedback
          await addPoints(5, "aiFeedback");
        }
      } finally {
        clearInterval(progressInterval);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      setIsSubmit(false);
    } finally {
      // setProgressBar(100); // Ensure progress bar reaches 100
      // setTimeout(() => setProgressBar(0), 1000); // Reset progress bar after a short delay
    }
  };

  const resolvedExamId = examId ?? practice.taskId;
  const shouldShowPractice: boolean =
    practice.isFree ||
    !!(!practice.isFree &&
      (hideHeader
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
          )));

  const [menuShowModal, setMenuShowModal] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setMenuShowModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const buildFinalQuery = () => {
    const params = new URLSearchParams();
    if (browserAttemptId) params.set("attemptId", browserAttemptId);
    if (section) params.set("section", section);

    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const handleBack = () => {
    const finalQuery = buildFinalQuery();

    if (page == "description" && passageIndex == 0) {
      if (partId === 1 || (section === "writing" && partId === 11)) {
        router.push("/exam-overview");
      } else {
        router.push(
          "/exams/exam_" +
            practice.taskId +
            "/part" +
            (partId - 1).toString() +
            finalQuery
        );
      }
    } else if (page == "question" && partId === 11) {
      setPage("description");
    } else if (page == "question") {
      router.push(
        "/exams/exam_" +
          practice.taskId +
          "/part" +
          (partId - 1).toString() +
          finalQuery
      );
    }

    setTime(1620);
  };

  const handleHeaderNext = () => {
    const finalQuery = buildFinalQuery();

    if (page == "description") {
      setPage("question");
    } else if (page == "question") {
      if (section === "writing" && partId >= 12) {
        router.push(`/exams/exam_${practice.taskId}/results${finalQuery}`);
      } else {
        router.push(
          "/exams/exam_" +
            practice.taskId +
            "/part" +
            (partId + 1).toString() +
            finalQuery
        );
      }
    }

    setTime(1620);
  };

  const officialFrameTitle = buildOfficialExamTitle(
    examName ?? practice.name,
    `Practice Test ${examNumber ?? ""}`.trim() || "Practice Test",
    "Writing Test"
  );

  const officialStatusSlot =
    shouldShowPractice && page === "question" ? (
      <OfficialStatusText>
        {formatOfficialTimeRemaining(time)}
      </OfficialStatusText>
    ) : null;

  return (
    <div className=" mx-auto w-full h-full  p-2  transition-all duration-300 flex gap-5">
      {noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}
      <div className="flex flex-col w-full">
        {!hideHeader && (
          <ExamHeader examPractice="Writing" ref={ref} setShowModal={setMenuShowModal} menuShowModal={menuShowModal} examId={practice.taskId} partId={partId} examName={examName ?? practice.name} examNumber={examNumber} practiceSections={resolvedPracticeSections} getPartsForSection={resolvedGetPartsForSection} viewMode={resolvedViewMode} setViewMode={resolvedSetViewMode} />
        )}

        {isOfficialMode ? (
          <WritingOfficialView
            title={officialFrameTitle}
            page={page as "description" | "question"}
            practice={practice}
            shouldShowPractice={shouldShowPractice}
            wordCount={wordCount}
            progressBar={progressBar}
            isSubmit={isSubmit}
            tryToSubmit={tryToSubmit}
            text={text}
            completionActionLabel={
              partId >= 12
                ? section === "writing"
                  ? "Finish Exam"
                  : "Next Section"
                : "Next Part"
            }
            onLockedAction={() => router.push("/pricing")}
            onTextChange={(value) => {
              if (!user || !shouldShowPractice) {
                router.push("/pricing");
              }
              setTryToSubmit(false);
              const nextWordCount = value.trim().split(/\s+/).filter(Boolean).length;
              setWordCount(nextWordCount);
              setText(value);
            }}
            onSubmit={() => {
              if (!user || !shouldShowPractice) {
                router.push("/pricing");
                return;
              }
              if (!isSubmit && wordCount > 20) {
                setIsSubmit(true);
                setTryToSubmit(false);
              } else {
                setTryToSubmit(true);
              }
            }}
            onCompletionAction={() => {
              const finalQuery = buildFinalQuery();

              if (section === "writing" && partId >= 12) {
                setShowContinueModal(true);
              } else {
                router.push(
                  "/exams/exam_" +
                    practice.taskId +
                    "/part" +
                    (partId + 1).toString() +
                    finalQuery
                );
              }
            }}
            primaryActionLabel={page == "description" ? "Next" : section === "writing" && partId >= 12 ? "Finish Exam" : "Next"}
            onPrimaryAction={handleHeaderNext}
            onBack={handleBack}
            statusSlot={officialStatusSlot}
          />
        ) : (
        <div className="bg-white rounded-xl flex flex-col screen1280:!h-[920px] overflow-auto border border-outline w-full shadow-[0_18px_44px_rgba(55,70,92,0.08)]">
          <PracticeExamCardHeader
            partTitle={PRACTICE_PARTS[partId - 1]}
            taskLabel={`Writing Task ${partId - 10}`}
            onBack={handleBack}
            onNext={handleHeaderNext}
            nextLabel={
              section === "writing" && partId >= 12 ? "Finish Exam" : "Next"
            }
            trailingSlot={
              shouldShowPractice && page === "question" ? (
                <div className="min-w-[128px] rounded-full border border-error1/15 bg-error1/10 px-4 py-2 text-center font-body text-[15px] font-extrabold text-error1">
                  {time > 0
                    ? `${Math.floor(time / 60)}:${time % 60 < 10 ? `0${time % 60}` : time % 60}`
                    : "Time's Up!"}
                </div>
              ) : undefined
            }
          />
          <div className="flex flex-col h-full overflow-hidden w-full">
            {page == "description" && (
              <div className="p-6">
                <p className="text-lg font-bold text-gray-800 mb-2">
                  What is this part?
                </p>
                <div className="prose max-w-none text-[14px] marker:text-blue-600">
                  <ul>
                    <li>You will complete two writing tasks.</li>
                    <li>The first task gives you 27 minutes to respond.</li>
                    <li>
                      The second task gives you 26 minutes to complete your
                      response.
                    </li>
                  </ul>
                </div>
              </div>
            )}
            {page == "question" && (
              <div className="flex flex-col h-full overflow-hidden w-full ">
                <div className="grid lg:grid-cols-2 grid-cols-1 h-full w-full">
                  <div className="p-4 overflow-y-auto lg:border-r border-r-0 border-b lg:border-b-0 border-slate-300 [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                    <div className="relative">
                      <p className="text-[14px] text-gray-400 mb-2">
                        Read the following message.
                      </p>
                      <p className="whitespace-pre-line font-normal leading-6 mb-4">
                        {!shouldShowPractice ? (
                          <>
                            <span>
                              {practice.passages[0].body?.slice(0, 150)}
                            </span>
                            <span className="text-slate-500 blur-sm">
                              {practice.passages[0].body?.slice(100)}
                            </span>
                          </>
                        ) : (
                          <span>{practice.passages[0].body}</span>
                        )}
                      </p>
                      {!shouldShowPractice && (
                        <div className="absolute inset-0 top-20 items-center justify-center flex flex-col gap-2">
                          <Button
                            variant="outline"
                            className="flex mt-[32px] gap-[8px] text-white items-center text-[14px] font-normal justify-center cursor-pointer rounded-[24px] bg-[#4A7DFF]"
                            aria-label="Next testimonial"
                            onClick={() => {
                              if (freeUser) {
                                router.push("/pricing");
                              } else {
                                setShowLoginModal(true);
                              }
                            }}
                          >
                            Upgrade to Pro
                            <SvgArrowRight />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4  overflow-y-auto [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                    {(!tryToSubmit && !isSubmit) ||
                      (wordCount < 20 && tryToSubmit) ? (
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-[14px] text-[#212E42] font-semibold mb-2">
                            Write to See your Score
                          </h3>
                          <div className="text-[14px]  flex items-center  rounded-[28px] min-h-[36px] pb-[10px] bg-[#E6E6E6] px-[16px]">
                            Words: {wordCount}
                          </div>
                        </div>
                        <textarea
                          className="w-full h-[400px] p-[16px] border rounded-[8px] border-[#D5D6D8] bg-white"
                          placeholder="Type your response here..."
                          value={text}
                          onChange={(e) => {
                            if (!user) {
                              router.push("/pricing");
                            } else if (!shouldShowPractice) {
                              router.push("/pricing");
                            }
                            setTryToSubmit(false);
                            const wordCount = e.target.value
                              .trim()
                              .split(/\s+/)
                              .filter(Boolean).length;
                            setWordCount(wordCount);
                            setText(e.target.value);
                          }}
                        ></textarea>

                        <div className="mt-4 flex flex-col justify-end">
                          <div
                            hidden={!tryToSubmit}
                            className="mt-2 mb-2 bg-[#FFE2E8] h-[40px] flex items-center px-[16px] rounded-[8px]"
                          >
                            <p className="text-[#EE4266] font-medium text-center text-[14px]">
                              Your response must be at least 20 words long.
                            </p>
                          </div>

                          <button
                            disabled={progressBar > 0}
                            className="flex h-[40px] items-center justify-center text-white text-[14px] font-normal  rounded-[24px] bg-[#4A7DFF] w-full"
                            onClick={() => {
                              if (!user) {
                                router.push("/pricing");
                                return;
                              }
                              if (!shouldShowPractice) {
                                router.push("/pricing");
                                return;
                              }
                              if (!isSubmit && wordCount > 20) {
                                setIsSubmit(true);
                                setTryToSubmit(false);
                              } else {
                                setTryToSubmit(true);
                              }
                            }}
                          >
                            {progressBar > 0 ? "In progress ..." : "Submit"}
                          </button>
                        </div>
                      </div>
                    ) : isSubmit && progressBar == 100 ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex flex-col items-center gap-2">
                          <SvgCheckCircle className="text-[#0DAA94]" />
                          <span className="text-[#0DAA94] font-bold text-[18px]">
                            Your answer submitted!
                          </span>
                          <p className="text-[14px] font-medium text-[#37465C]">
                            You can now proceed to the next step.
                          </p>
                          <Button
                            className="mt-4 bg-[#4A7DFF] text-white rounded-full px-6 py-2"
                            onClick={() => {
                              const query = section ? `?section=${section}` : "";
                              const attemptQuery = browserAttemptId ? `attemptId=${browserAttemptId}` : "";
                              const finalQuery = query
                                ? (attemptQuery ? `?${attemptQuery}&${query.replace("?", "")}` : query)
                                : (attemptQuery ? `?${attemptQuery}` : "");

                              if (section === "writing" && partId >= 12) {
                                setShowContinueModal(true);
                              } else {
                                router.push(
                                  "/exams/exam_" +
                                  practice.taskId +
                                  "/part" +
                                  (partId + 1).toString() +
                                  finalQuery
                                );
                              }
                            }}
                          >
                            {partId >= 12
                              ? section === "writing"
                                ? "Finish Exam"
                                : "Next Section"
                              : "Next Part"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      isSubmit &&
                      progressBar < 100 && (
                        <div className="flex flex-col items-center justify-center mx-auto space-y-2 w-full">
                          <div className="text-center text-[14px] font-medium text-gray-800 mb-2 w-full">
                            Upload your answer...
                          </div>
                          <Autorenew className="w-8 h-8 text-gray-800 animate-spin" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Trophy Modal */}
      <TrophyModal
        isOpen={isModalOpen}
        onClose={closeTrophy}
        trophy={currentTrophy}
        userPoints={userPoints}
        timeSpent={timeSpent}
      />
      {
        showContinueModal && (
          <ContinueExamModal
            completedSectionName="Writing"
            onViewResults={() => {
              setShowContinueModal(false);
              router.push(
                mockExamSectionResultsHref(
                  String(practice.taskId),
                  "writing",
                  browserAttemptId
                )
              );
            }}
            onContinue={() => {
              setShowContinueModal(false);
              const attemptQuery = browserAttemptId ? `&attemptId=${browserAttemptId}` : "";
              router.push(
                `/exams/exam_${practice.taskId}/part13?section=speaking${attemptQuery}`
              );
            }}
            onFinish={() => {
              setShowContinueModal(false);
              router.push(`/exam-overview`);
            }}
            nextSectionName="Speaking"
          />
        )
      }
    </div>
  );
};

export default WritingExamView;
