import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import PracticeExamCardHeader from "../exam-parts/components/PracticeExamCardHeader";
import ChevronUp from "@mui/icons-material/KeyboardArrowUp";
import ChevronDown from "@mui/icons-material/KeyboardArrowDown";
import WorkspacePremium from "@mui/icons-material/WorkspacePremium";
import { TPracticeDto, TPracticeNavItem } from "@/models/practice.model";
import ListeningSideMenu from "../listening-practice/ListeningSideMenu";
import ListeningAnswerList from "./components/ListeningAnswers";
import { TPassage } from "@/models/listenExam.model";
import { useRouter } from "nextjs-toploader/app";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { TWritingAnswerDto } from "@/models/answer";
import { cn } from "@/lib/utils";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import dynamic from "next/dynamic";
import Image from "next/image";
import PlanCard from "@/components/pages/dashboard/PlanCard";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
// planDetails import removed

import LoginModal from "@/components/modal/LoginModal";
import { PricingNavModal } from "@/components/pages/pricing/PricingNavModal";
import { usePricingNavModal } from "@/hooks/usePricingNavModal";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";
import { ActivityLogger } from "@/lib/userActivity";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { runPracticeSubmitSideEffects } from "@/lib/practiceSubmitSideEffects";
import { startPracticeSubmitProgress } from "@/lib/practiceSubmitProgress";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";
import StatBadge from "@/components/shared/StatBadge";
import { usePracticeCount } from "@/hooks/usePracticeCount";
import { practicePath } from "@/lib/practiceRoutes";
import { sanitizeMockExamAttemptIdParam } from "@/lib/mockExamAttemptId";
import {
  hasGuestWritingTrialAvailable,
  loadGuestWritingAnswers,
  markGuestWritingTrialUsed,
  saveGuestWritingAnswer,
} from "@/lib/writingFreeTrial";

const SvgBestValuePlan = dynamic(
  () => import("../../../components/icons/BestValuePlan"),
  {
    ssr: true,
  }
);
const SvgPopularPlan = dynamic(
  () => import("../../../components/icons/PopularPlan"),
  {
    ssr: true,
  }
);
const SvgFreePlan = dynamic(
  () => import("../../../components/icons/FreePlan"),
  {
    ssr: true,
  }
);
interface WritingPracticeViewProps {
  practice: TPracticeDto;
  task: TTaskSchemaDto;
  allPractices: TPracticeNavItem[];
  selectedPracticeId: string | null;
  selectedTaskId: string | null;
  completedPracticeId: string[];
  onAnswerButtonClick: (
    practice: TPracticeDto,
    result: Record<string, any>
  ) => void;
  onBackClick: () => void;
  onComplete: () => void;
  onUpgrade: () => void;
  onNextPractice: () => void;
  initialWritingAnswers?: TWritingAnswerDto[];
  routePracticeId?: string;
  totalWritingAnswerCount?: number;
}

const WritingPracticeView = ({
  practice,
  task,
  allPractices,
  selectedPracticeId,
  selectedTaskId,
  completedPracticeId,
  onBackClick,
  onAnswerButtonClick,
  initialWritingAnswers = [],
  routePracticeId,
  totalWritingAnswerCount = 0,
}: WritingPracticeViewProps) => {
  const practiceCount = usePracticeCount(task.id, practice.id, task.taskNumber);
  const router = useRouter();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(false);
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
  const isPaidUser = hasPaidPracticeAccess(
    user?.publicMetadata.plan as string | undefined,
    user?.publicMetadata.purchaseDate as string | undefined
  );
  const guestTrialAvailable =
    noUser && practice.isFree && hasGuestWritingTrialAvailable();
  const shouldShowPractice: boolean =
    practice.isFree ||
    isPaidUser ||
    guestTrialAvailable;
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const browserAttemptId = sanitizeMockExamAttemptIdParam(searchParams.get("attemptId"));
  const [page, setPage] = useState(
    practice.id.includes("part11") ? "description" : "question"
  );
  const [passageIndex, setPassageIndex] = useState(0);
  const [time, setTime] = useState(1620);
  const [wordCount, setWordCount] = useState(0);
  const [progressBar, setProgressBar] = useState(0);
  const [isSubmit, setIsSubmit] = useState(false);
  const [text, setText] = useState("");
  const [tryToSubmit, setTryToSubmit] = useState(false);
  const [questionIndexInPractice, setQuestionIndexInPractice] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [isOpen, setIsOpen] = useState<Record<number, boolean>>({});
  const [isPlaying, setIsPlaying] = useState(false);

  const { open: pricingModalOpen, setOpen: setPricingModalOpen, openPricingModal } =
    usePricingNavModal();
  const [answers, setAnswers] = useState<any[]>([]);
  const [freeAttempts, setFreeAttempts] = useState<number | null>(3);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
    // Log mock exam started when component mounts
    if (user && practice.taskId) {
      const loggerAttemptId = browserAttemptId || `mock_${practice.taskId}_${Date.now()}`;
      ActivityLogger.mockStarted(loggerAttemptId, practice.taskId.toString());
    }
  }, [user, practice.taskId, browserAttemptId]);

  useEffect(() => {
    if (!isSubmit) return;
    void submitAnswer();
  }, [isSubmit]);

  useEffect(() => {
    if (isPaidUser) {
      setFreeAttempts(null);
    } else if (noUser) {
      setFreeAttempts(guestTrialAvailable ? 1 : 0);
    } else {
      setFreeAttempts(totalWritingAnswerCount >= 1 ? 0 : 1);
    }
  }, [isPaidUser, noUser, guestTrialAvailable, totalWritingAnswerCount, answers.length]);

  const fetchUsersAnswer = useCallback(async () => {
    if (!practice?.id) return;
    if (!isSignedIn) {
      setAnswers([]);
      return;
    }

    try {
      const qs = new URLSearchParams({ practiceId: practice.id });
      const response = await fetch(`/api/answers/writing?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        setAnswers([]);
        return;
      }

      if (!response.ok) {
        setAnswers([]);
        return;
      }

      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setAnswers((prev) => (items.length > 0 ? items : prev));
    } catch {
      setAnswers([]);
    }
  }, [practice?.id, isSignedIn]);

  const submitAnswer = async () => {
    const stopProgress = startPracticeSubmitProgress(setProgressBar);
    const endpoint = noUser
      ? "/api/answers/writing/guest"
      : "/api/answers/writing";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceId: practice.id,
          text,
          attemptId: browserAttemptId,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 403 && noUser) {
          openPricingModal();
        }
        throw new Error(
          typeof err.message === "string"
            ? err.message
            : "Network response was not ok."
        );
      }

      const result = await response.json();
      setProgressBar(100);
      onAnswerButtonClick(practice, result);

      if (noUser) {
        markGuestWritingTrialUsed();
        saveGuestWritingAnswer(practice.id, result);
        setAnswers([result as TWritingAnswerDto]);
      } else if (typeof result?.id === "string") {
        setAnswers((prev) => [
          result as TWritingAnswerDto,
          ...prev.filter((a) => a.id !== result.id),
        ]);
      }

      if (!noUser) {
        runPracticeSubmitSideEffects({
          practiceId: practice.id,
          skill: "Writing",
          overallScore: result.overall ?? result.overalScore ?? 0,
          result,
          durationSeconds: time,
          usage: result.usage,
          pointsAwarded,
          addPoints,
          checkTrophyAchievements,
          onPointsAwarded: () => setPointsAwarded(true),
          onAiFeedbackPointsAwarded: () => {},
        });
      }

      setTryToSubmit(false);
      setIsSubmit(false);
      if (!noUser) {
        void fetchUsersAnswer();
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      stopProgress();
      setTimeout(() => setProgressBar(0), 600);
    }
  };
  // Reset draft and in-task state only when the user switches practice — not when
  // Clerk finishes loading (`user` / `isSignedIn`) or `fetchUsersAnswer` identity
  // changes, which previously re-ran this effect and cleared the textarea mid-write.
  useEffect(() => {
    setQuestionIndexInPractice(0);
    setPassageIndex(0);
    setQuestionIndex(0);
    setSelectedAnswers({});
    setText("");
    setProgressBar(0);
    setIsSubmit(false);

    if (routePracticeId && practice.id === routePracticeId) {
      setAnswers(initialWritingAnswers);
    } else if (noUser) {
      setAnswers(loadGuestWritingAnswers(practice.id));
    } else {
      void fetchUsersAnswer();
    }

    if (user && selectedPracticeId) {
      const practiceAttemptId = `practice_${selectedPracticeId}_${Date.now()}`;
      ActivityLogger.practiceStarted(practiceAttemptId, selectedPracticeId, "Writing").catch(
        (error) => {
          console.error("Error logging practice started:", error);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit user/fetchUsersAnswer to avoid wiping the draft when auth hydrates
  }, [selectedPracticeId, practice.id, routePracticeId, initialWritingAnswers]);

  useEffect(() => {
    if (routePracticeId && practice.id === routePracticeId) {
      return;
    }
    void fetchUsersAnswer();
  }, [fetchUsersAnswer, practice.id, routePracticeId]);
  // const {
  //   selectedAnswers,
  //   showResults,
  //   score,
  //   handleAnswerSelect,
  //   handleSubmit,
  //   allQuestionsAnswered,
  //   getCorrectAnswersCount,
  // } = useListeningPracticeQuestions(practice.passages[0].questions);

  const handleAnswerSelect = (questionId: number, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const writingPracticeIndex = allPractices.findIndex(
    (p) => p.id == selectedPracticeId
  );

  const resetWritingSessionState = () => {
    setTime(1620);
    setText("");
    setWordCount(0);
    setProgressBar(0);
    setIsSubmit(false);
    setTryToSubmit(false);
  };

  const handleHeaderBack = () => {
    if (writingPracticeIndex > 0 && selectedTaskId) {
      setPage("question");
      resetWritingSessionState();
      router.push(
        practicePath(
          "writing",
          allPractices[writingPracticeIndex - 1].id,
          selectedTaskId
        )
      );
    }
  };

  const handleHeaderNext = () => {
    if (writingPracticeIndex < allPractices.length - 1 && selectedTaskId) {
      setPage("question");
      resetWritingSessionState();
      router.push(
        practicePath(
          "writing",
          allPractices[writingPracticeIndex + 1].id,
          selectedTaskId
        )
      );
    }
  };

  if (
    !isHydrated ||
    !isLoaded ||
    (isSignedIn && user && user.publicMetadata?.plan === undefined)
  ) {
    return (
      <div className="text-center py-10 text-gray-500 w-full">Loading...</div>
    );
  }

  return (
    <div className=" w-full transition-all duration-300 flex gap-5">
      {noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}

      <ListeningSideMenu
        allPractices={allPractices}
        task={task}
        practice={practice}
        isCompleted={false}
        isPlaying={isPlaying}
        onBackClick={onBackClick}
        selectedPracticeId={selectedPracticeId}
        selectedTaskId={selectedTaskId}
        completedPractice={completedPracticeId}
      />
      <div className="mb-[120px] flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-outline bg-white shadow-[0_18px_44px_rgba(55,70,92,0.08)] screen1280:!h-[920px]">
        <PracticeExamCardHeader
          partTitle={practice.passages[passageIndex].title}
          metaSlot={
            <StatBadge count={practiceCount} label="answered today" />
          }
          onBack={handleHeaderBack}
          onNext={handleHeaderNext}
          showBack={writingPracticeIndex > 0}
          showNext={writingPracticeIndex < allPractices.length - 1}
          trailingSlot={
            shouldShowPractice && page === "question" ? (
              <div className="min-w-[128px] shrink-0 rounded-full border border-error1/15 bg-error1/10 px-4 py-2 text-center font-body text-[15px] font-extrabold text-error1">
                {time > 0
                  ? `${Math.floor(time / 60)}:${time % 60 < 10 ? `0${time % 60}` : time % 60}`
                  : "Time's Up!"}
              </div>
            ) : undefined
          }
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full">
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
                            if (noUser) {
                              setShowLoginModal(true);
                            } else if (freeUser) {
                              openPricingModal();
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
                  <div className="flex flex-col mt-6 max-w-lg mx-auto">
                    {practice?.passages?.[0]?.sampleResponse?.map(
                      (response, index, array) => {
                        return (
                          <div key={index}>
                            <button
                              onClick={() =>
                                setIsOpen((prev) => ({
                                  ...prev,
                                  [index]: !prev[index],
                                }))
                              }
                              className="w-full flex justify-between items-center px-4 py-2 border border-gray-200 shadow-sm bg-white text-xs font-medium text-slate-700 font-medium text-black"
                              style={{
                                borderTopLeftRadius:
                                  index > 0 ? "0.0rem" : "1.0rem",
                                borderTopRightRadius:
                                  index > 0 ? "0.0rem" : "1.0rem",
                                borderBottomLeftRadius: isOpen[index]
                                  ? "0"
                                  : index < array.length - 1
                                    ? "0.0rem"
                                    : "1.0rem",
                                borderBottomRightRadius: isOpen[index]
                                  ? "0"
                                  : index < array.length - 1
                                    ? "0.0rem"
                                    : "1.0rem",
                              }}
                            >
                              {response.title}
                              {isOpen[index] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            {isOpen[index] && (
                              <div
                                className="w-full mx-auto bg-white shadow-md mb-10 border border-gray-200"
                                style={{
                                  borderTopLeftRadius: "0",
                                  borderTopRightRadius: "0",
                                  borderBottomLeftRadius: "1.0rem",
                                  borderBottomRightRadius: "1.0rem",
                                }}
                              >
                                <div className="bg-gray-100 space-y-3 p-4">
                                  <p className="whitespace-pre-line px-3 flex flex-col gap-3 text-[14px] text-gray-700">
                                    {shouldShowPractice ? (
                                      <span>{response.body}</span>
                                    ) : (
                                      <>
                                        <span className="text-slate-500 blur-sm">
                                          {response.body}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="p-4 overflow-y-auto [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[14px] text-[#212E42] font-semibold mb-2">
                        Write to See your Score
                      </h3>
                      <div className="text-[14px] flex items-center justify-center rounded-[28px] min-h-[36px]  bg-[#E6E6E6] px-[16px]">
                        Words: {wordCount}
                      </div>
                    </div>
                    <textarea
                      className="w-full h-[400px] p-[16px] border rounded-[8px] border-[#D5D6D8] bg-white"
                      placeholder="Type your response here..."
                      value={text}
                      onChange={(e) => {
                        if (!shouldShowPractice) {
                          openPricingModal();
                          return;
                        }
                        const wordCount = e.target.value
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean).length;
                        setWordCount(wordCount);
                        setText(e.target.value);
                      }}
                    ></textarea>

                    <div className="mt-4 flex flex-col justify-end">
                      {isSubmit && (
                        <p className="text-gray-700 font-medium text-center text-[14px] mb-2">
                          {
                            [
                              "Submitting your response…",
                              "Processing your text…",
                              "Processing your text…",
                              "Analyzing your writing…",
                              "Analyzing your writing…",
                              "Analyzing your writing…",
                              "Calculating your score…",
                              "Calculating your score…",
                              "Generating feedback…",
                              "Generating feedback…",
                              "Generating feedback…",
                            ][Math.floor(progressBar / 10)]
                          }
                        </p>
                      )}
                      <div
                        hidden={!progressBar}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        role="progressbar"
                        data-state="indeterminate"
                        data-max="100"
                        className="relative overflow-hidden rounded-full bg-slate-200 h-2 w-full mb-4"
                      >
                        <div
                          data-state="indeterminate"
                          data-max="100"
                          className="h-full flex-1 bg-blue-500 transition-all"
                          style={{
                            width: `${progressBar}%`,
                            transition: "width 0.5s linear",
                          }}
                        ></div>
                      </div>
                      <div
                        hidden={!tryToSubmit}
                        className="mt-2 mb-2 bg-[#FFE2E8] h-[40px] flex items-center px-[16px] rounded-[8px]"
                      >
                        <p className="text-[#EE4266] font-medium text-center text-[14px]">
                          Your response must be at least 20 words long.
                        </p>
                      </div>
                      {freeAttempts === 0 && (
                        <div className="text-[14px] text-center mt-2 mb-2">
                          <p className="text-[14px] text-gray-600">
                            Your free credits are over. Subscribe to submit your
                            response.
                          </p>
                        </div>
                      )}
                      {shouldShowPractice &&
                        (freeAttempts === null || freeAttempts > 0) && (
                          <button
                            disabled={progressBar > 0}
                            className="cursor-pointer flex h-[40px] items-center justify-center text-white text-[14px] font-normal  rounded-[24px] bg-[#4A7DFF] w-full"
                            onClick={() => {
                              if (!shouldShowPractice) {
                                openPricingModal();
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
                            {progressBar > 0
                              ? "In progress ..."
                              : "Submit to get your score"}
                          </button>
                        )}
                      {(!shouldShowPractice || freeAttempts == 0) && (
                        <button
                          disabled={progressBar > 0}
                          className="flex h-[40px] items-center justify-center text-white text-[14px] font-normal  rounded-[24px] bg-[#4A7DFF] w-full"
                          onClick={() => {
                            openPricingModal();
                          }}
                        >
                          <WorkspacePremium className="mr-2 h-4 w-4" />
                          Subscribe
                        </button>
                      )}
                      {shouldShowPractice && freeAttempts !== null && freeAttempts > 0 && (
                        <div className="text-[14px] text-center mt-2">
                          <p className="text-[14px] text-gray-600">
                            {noUser ? (
                              <>
                                <b className="text-gray-900">1 free try</b> — no
                                account required. Sign up afterward to save your
                                results.
                              </>
                            ) : (
                              <>
                                You have{" "}
                                <b className="text-gray-900">
                                  {freeAttempts} free attempt
                                  {freeAttempts === 1 ? "" : "s"}
                                </b>{" "}
                                remaining.
                              </>
                            )}
                          </p>
                        </div>
                      )}
                      {answers.length > 0 && (
                        <div className="flex border-t border-slate-300 mt-4 py-4 flex-col gap-2">
                          <h3 className="text-[14px] font-semibold text-slate-800 mb-1">
                            Your Submissions:
                          </h3>
                          {answers.map((answer: TWritingAnswerDto, index) => (
                            <div
                              key={index}
                              className="flex px-3 py-1 justify-between border flex-shrink-0 flex-grow-0 bg-white shadow-sm cursor-pointer items-center transition-all hover:shadow-md rounded-xl h-14"
                              onClick={() => {
                                onAnswerButtonClick(practice, answer);
                              }}
                            >
                              <p className="text-xs text-slate-800 font-medium text-center">
                                {index + 1}.{" "}
                                {(() => {
                                  if (!answer.createdAt) {
                                    return "Unknown date";
                                  }
                                  const now = new Date();
                                  const createdAt = new Date(answer.createdAt);
                                  const diffInMs =
                                    now.getTime() - createdAt.getTime();
                                  const diffInMinutes = Math.floor(
                                    diffInMs / (1000 * 60)
                                  );
                                  const diffInHours = Math.floor(
                                    diffInMs / (1000 * 60 * 60)
                                  );
                                  const diffInDays = Math.floor(
                                    diffInMs / (1000 * 60 * 60 * 24)
                                  );

                                  if (diffInMinutes < 60) {
                                    return `${diffInMinutes} minutes ago`;
                                  } else if (diffInHours < 24) {
                                    return `${diffInHours} hours ago`;
                                  } else if (diffInDays < 365) {
                                    return createdAt.toLocaleDateString(
                                      "en-US",
                                      { month: "short", day: "2-digit" }
                                    );
                                  } else {
                                    return createdAt.toLocaleDateString(
                                      "en-US",
                                      { year: "2-digit", month: "short" }
                                    );
                                  }
                                })()}
                              </p>
                              <div
                                className="relative"
                                style={{ width: "40px", height: "40px" }}
                              >
                                <svg
                                  className="transform -rotate-90"
                                  width="40"
                                  height="40"
                                >
                                  <circle
                                    className="stroke-slate-200"
                                    strokeWidth="4"
                                    fill="transparent"
                                    r="18"
                                    cx="20"
                                    cy="20"
                                  ></circle>
                                  <circle
                                    // stroke="#CC6633"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    fill="transparent"
                                    r="18"
                                    cx="20"
                                    cy="20"
                                    className={cn(
                                      "stroke-current transition-all duration-500 ease-in-out",
                                      (() => {
                                        const percentage =
                                          ((answer.overalScore ?? 0) / 12) * 100;
                                        if (percentage >= 66.7)
                                          return "text-green-500"; // High score (8+ out of 12)
                                        if (percentage >= 50)
                                          return "text-yellow-500"; // Medium score (6-8 out of 12)
                                        if (percentage >= 33.3)
                                          return "text-orange-500"; // Low-medium score (4-6 out of 12)
                                        return "text-red-500"; // Low score (0-4 out of 12)
                                      })()
                                    )}
                                    style={{
                                      strokeDasharray: 120,
                                      strokeDashoffset:
                                        120 - (answer.overalScore ?? 0) * 10,
                                      transition: "stroke-dashoffset 0.5s",
                                    }}
                                  ></circle>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span
                                    className={cn(
                                      "font-bold text-[14px]",
                                      (() => {
                                        const percentage =
                                          ((answer.overalScore ?? 0) / 12) * 100;
                                        if (percentage >= 66.7)
                                          return "text-green-500"; // High score (8+ out of 12)
                                        if (percentage >= 50)
                                          return "text-yellow-500"; // Medium score (6-8 out of 12)
                                        if (percentage >= 33.3)
                                          return "text-orange-500"; // Low-medium score (4-6 out of 12)
                                        return "text-red-500"; // Low score (0-4 out of 12)
                                      })()
                                    )}
                                  >
                                    {answer.overalScore ?? 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {page == "answer" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto w-full [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100">
              <ListeningAnswerList
                questionIndex={questionIndex}
                questions={practice.passages.reduce(
                  (current: Array<any>, passage: TPassage) => {
                    return current.concat(passage.questions);
                  },
                  []
                )}
                onAnswerSelect={handleAnswerSelect}
                selectedAnswers={selectedAnswers}
              />
            </div>
          )}
        </div>
      </div>

      {/* Trophy Modal */}
      <TrophyModal
        isOpen={isModalOpen}
        onClose={closeTrophy}
        trophy={currentTrophy}
        userPoints={userPoints}
        timeSpent={timeSpent}
      />
      <PricingNavModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
    </div>
  );
};

export default WritingPracticeView;
