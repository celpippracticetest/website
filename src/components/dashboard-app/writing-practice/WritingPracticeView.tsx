import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Gem,
  ArrowLeft,
} from "lucide-react";
import { TPracticeDto } from "@/models/practice.model";
import ListeningSideMenu from "../listening-practice/ListeningSideMenu";
import ListeningAnswerList from "./components/ListeningAnswers";
import { TPassage } from "@/models/listenExam.model";
import { useRouter } from "nextjs-toploader/app";
import { useEffect } from "react";

import useStore from "@/store";
import { TWritingAnswerDto } from "@/models/answer";
import { cn } from "@/lib/utils";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import Image from "next/image";
import PlanCard from "@/components/pages/dashboard/PlanCard";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { planDetails } from "@/components/dashboard-new/Plans";
import LoginModal from "@/components/modal/LoginModal";
import UpgradeModal from "@/components/modal/UpgradeModal";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";
import { ActivityLogger } from "@/lib/userActivity";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";
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
  allPractices: TPracticeDto[];
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
}: WritingPracticeViewProps) => {
  const router = useRouter();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, isLoaded, isSignedIn } = useUser();
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
  const [showModal, setShowModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [page, setPage] = useState("question");
  const [passageIndex, setPassageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionIndexInPractice, setQuestionIndexInPractice] = useState(0);
  const [isOpen, setIsOpen] = useState<Record<number, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [time, setTime] = useState(1620);
  const [wordCount, setWordCount] = useState(0);
  const [progressBar, setProgressBar] = useState(0);
  const [isSubmit, setIsSubmit] = useState(false);
  const [text, setText] = useState("");
  const [tryToSubmit, setTryToSubmit] = useState(false);
  const shouldShowPractice: any =
    practice.isFree ||
    (!practice.isFree &&
      user &&
      user.publicMetadata.plan &&
      user.publicMetadata.plan === "premium");
  const [answers, setAnswers] = useState<any[]>([]);
  const [freeAttempts, setFreeAttempts] = useState<number | null>(3);
  const setPremiumPlanModalState = useStore(
    (state) => state.setPremiumPlanModalState
  );
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
    if (isSubmit) {
      submitAnswer();
    }
    fetchUsersAnswer();
  }, [isSubmit]);

  useEffect(() => {
    if (
      (user && !user.publicMetadata.plan) ||
      (user && user.publicMetadata.plan === "free")
    ) {
      setFreeAttempts(3 - answers.length > 0 ? 3 - answers.length : 0);
    } else {
      setFreeAttempts(null);
    }
  }, [user, answers]);

  const fetchUsersAnswer = async () => {
    try {
      const url = new URL("/api/answers/writing", window.location.origin);
      url.searchParams.append("practiceId", practice.id);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }
      const data = await response.json();
      setAnswers(data.items);
    } catch (error) {
      console.error("Error fetching answer:", error);
    }
  };

  const submitAnswer = async () => {
    try {
      setProgressBar(0); // Start loading
      const url = "/api/answers/writing";
      const requestData = {
        practiceId: practice.id,
        text,
      };

      // Simulate progress bar increment
      const progressInterval = setInterval(() => {
        setProgressBar((prev) => (prev < 100 ? prev + 1 : prev));
      }, 300); // Increment every 300ms to reach 100 in ~30s

      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      clearInterval(progressInterval); // Stop progress increment

      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }
      setProgressBar(100);
      const result = await response.json();

      // Log practice completed
      const attemptId = `practice_${practice.id}_${Date.now()}`;
      await ActivityLogger.practiceCompleted(
        attemptId,
        practice.id,
        "Writing",
        result.overall,
        result,
        time
      );

      // Add league points for practice completion
      await addPoints(
        10,
        "practiceSessions",
        `${Math.floor(time / 60)} minutes`
      );

      // Log AI feedback generation
      if (result.usage) {
        await ActivityLogger.aiFeedbackGenerated(
          "practice",
          "Writing",
          result.usage.prompt_tokens || 0,
          result.usage.completion_tokens || 0,
          attemptId
        );

        // Add league points for AI feedback
        await addPoints(5, "aiFeedback");
      }

      // Check for trophy achievements
      await checkTrophyAchievements(
        10,
        "practiceSessions",
        `${Math.floor(time / 60)}:${time % 60}`
      );

      onAnswerButtonClick(practice, result);
      setProgressBar(0);
      setTryToSubmit(false);
      setIsSubmit(false);
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setProgressBar(100); // Ensure progress bar reaches 100
      setTimeout(() => setProgressBar(0), 1000); // Reset progress bar after a short delay
    }
  };
  useEffect(() => {
    setQuestionIndexInPractice(0);
    setPassageIndex(0);
    setQuestionIndex(0);
    setSelectedAnswers({});
    setText("");
    setProgressBar(0);
    setIsSubmit(false);
    setIsSubmit(false);

    // Log practice started
    if (user && selectedPracticeId) {
      const attemptId = `practice_${selectedPracticeId}_${Date.now()}`;
      ActivityLogger.practiceStarted(attemptId, selectedPracticeId, "Writing");
    }
  }, [selectedPracticeId, user]);
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

  if (!isLoaded || (user && user.publicMetadata?.plan === undefined)) {
    return (
      <div className="text-center py-10 text-gray-500 w-full">Loading...</div>
    );
  }

  return (
    <div className=" w-full transition-all duration-300 flex gap-5">
      {freeUser ? (
        showModal && <UpgradeModal setShowModal={setShowModal} />
      ) : noUser ? (
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
      <div className="bg-white rounded-xl  flex flex-col overflow-hidden border border-[#D5D6D8] h-full w-full">
        <div className="flex justify-between pb-[21px]  lg:items-center gap-2 lg:gap-0 px-6 py-4 border-b border-[#D5D6D8] lg:flex-row flex-col w-full  h-auto bg-[#FFEBD6]">
          <div className="flex gap-2 flex-col screen744:!shrink-0">
            <h1 className="text-[18px] font-bold text-[#212E42]">
              {practice.passages[passageIndex].title}
            </h1>
          </div>
          {
            <div className="flex items-center gap-2 justify-end pb-[10px] ">
              {shouldShowPractice && page === "question" && (
                <div className="flex justify-center items-center lg:flex-row flex-col">
                  <div className="text-[14px] font-bold gap-2 text-center text-[#EE4266] flex items-center">
                    <p>
                      {time > 0
                        ? `${Math.floor(time / 60)}:${
                            time % 60 < 10 ? `0${time % 60}` : time % 60
                          }`
                        : "Time's Up!"}
                    </p>
                  </div>
                </div>
              )}

              {allPractices.findIndex((p) => p.id == selectedPracticeId) <
                allPractices.length - 1 && (
                <button
                  onClick={() => {
                    const practiceIndex = allPractices.findIndex(
                      (p) => p.id == selectedPracticeId
                    );
                    if (practiceIndex < allPractices.length - 1) {
                      const taskUrl = selectedTaskId
                        ? "&taskId=" + selectedTaskId
                        : "";
                      setPage("question");
                      setTime(1620);
                      setText("");
                      setWordCount(0);
                      setProgressBar(0);
                      setIsSubmit(false);
                      setTryToSubmit(false);
                      router.push(
                        "/writing?selectedPracticeId=" +
                          allPractices[practiceIndex + 1].id +
                          taskUrl
                      );
                    } else {
                    }
                  }}
                  className={`cursor-pointer text-[14px] font-normal  inline-flex items-center justify-center rounded-[24px] bg-white  w-[96px] h-[40px]`}
                >
                  {"Next"}
                  <ArrowRight
                    size={18}
                    strokeWidth={1.7}
                    className="ml-2"
                  ></ArrowRight>
                </button>
              )}
            </div>
          }
        </div>
        <div className="flex flex-col h-full overflow-hidden w-full">
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
                              setShowModal(true);
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
                      <div className="text-[14px] flex items-center rounded-[28px] min-h-[36px] pb-[10px] bg-[#E6E6E6] px-[16px]">
                        Words: {wordCount}
                      </div>
                    </div>
                    <textarea
                      className="w-full h-[400px] p-[16px] border rounded-[8px] border-[#D5D6D8] bg-white"
                      placeholder="Type your response here..."
                      value={text}
                      onChange={(e) => {
                        if (!user) {
                          setPremiumPlanModalState();
                        } else if (!shouldShowPractice) {
                          setPremiumPlanModalState();
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
                              if (!user) {
                                setPremiumPlanModalState();
                                return;
                              }
                              if (!shouldShowPractice) {
                                setPremiumPlanModalState();
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
                            setPremiumPlanModalState();
                          }}
                        >
                          <Gem className="mr-2 h-4 w-4"></Gem>
                          Subscribe
                        </button>
                      )}
                      {shouldShowPractice && freeAttempts !== null && (
                        <div className="text-[14px] text-center mt-2">
                          <p className="text-[14px] text-gray-600">
                            You have{" "}
                            <b className="text-gray-900">
                              {" "}
                              {freeAttempts} free attempts{" "}
                            </b>{" "}
                            remaining.
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
                                          (answer.overalScore / 12) * 100;
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
                                        120 - answer.overalScore * 10,
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
                                          (answer.overalScore / 12) * 100;
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
                                    {answer.overalScore}
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
            <div className="flex flex-col h-full  w-full">
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
    </div>
  );
};

export default WritingPracticeView;
