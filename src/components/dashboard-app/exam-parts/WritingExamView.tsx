"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { TPracticeDto } from "@/models/practice.model";
import { useRouter } from "nextjs-toploader/app";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import useStore from "@/store";
import { useUser } from "@clerk/nextjs";
import SvgArrowRight from "@/components/icons/ArrowRight";
import UpgradeModal from "@/components/modal/UpgradeModal";
import LoginModal from "@/components/modal/LoginModal";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgChevronDownExam from "@/components/icons/ChevronDownExam";
import SvgWritingPart from "@/components/icons/WritingPart";
import SvgReadingPart from "@/components/icons/ReadingPart";
import SvgListeningPart from "@/components/icons/ListeningPart";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
import AskBeavoButton from "@/components/AskBeavo/AskBeavoButton";
import { ActivityLogger } from "@/lib/userActivity";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";
import { PRACTICE_PARTS } from "@/constants";
import ContinueExamModal from "@/components/modal/ContinueExamModal";

interface WritingExamViewProps {
  practice: TPracticeDto;
  partId: number;
  examId?: string;
  examName?: string;
  partNumber?: string;
}

const WritingExamView = ({
  practice,
  partId,
  examId,
  examName,
  partNumber,
}: WritingExamViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const [page, setPage] = useState(partId == 11 ? "description" : "question");
  const [passageIndex] = useState(0);
  const [time, setTime] = useState(1620);
  const [wordCount, setWordCount] = useState(0);
  const [progressBar, setProgressBar] = useState(0);
  const [isSubmit, setIsSubmit] = useState(false);
  const [text, setText] = useState("");
  const [tryToSubmit, setTryToSubmit] = useState(false);

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
  const [showContinueModal, setShowContinueModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
    // Log mock exam started when component mounts
    if (user && practice.taskId) {
      const attemptId = `mock_${practice.taskId}_${Date.now()}`;
      ActivityLogger.mockStarted(attemptId, practice.taskId.toString());
    }
  }, [user, practice.taskId]);

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
        attemptId: searchParams.get("attemptId") || undefined,
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

      // Log mock exam part completed
      const attemptId = searchParams.get("attemptId") || `mock_${practice.taskId}_${Date.now()}`;
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
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      // setProgressBar(100); // Ensure progress bar reaches 100
      // setTimeout(() => setProgressBar(0), 1000); // Reset progress bar after a short delay
    }
  };

  const shouldShowPractice: boolean =
    practice.isFree ||
    !!(!practice.isFree &&
      user &&
      user.publicMetadata.plan &&
      user.publicMetadata.plan === "premium");

  const [menuShowModal, setMenuShowModal] = useState(false);
  interface PracticeSection {
    title: string;
    color: string;
    icon: React.ReactNode;
    route: string;
    bgColor: string;
  }

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
  const practiceSections: PracticeSection[] = [
    {
      title: "Listening",
      color: "text-[#316BFF]",
      icon: <SvgListeningPart />,
      bgColor: "bg-[#D1DEFF]",
      route: "listening",
    },
    {
      title: "Reading",
      color: "text-[#F27059]",
      bgColor: "bg-[#FFE2E8]",
      icon: <SvgReadingPart />,
      route: "reading",
    },
    {
      title: "Writing",
      color: "text-[#0DAA94]",
      icon: <SvgWritingPart />,
      bgColor: "bg-[#F0FFFD]",
      route: "writing",
    },

    {
      title: "Speaking",
      color: "text-[#EE4266]",
      icon: <SvgSpeakingPart />,
      bgColor: "bg-[#FFEBD6]",

      route: "speaking",
    },
  ];
  const sectionRanges: Record<string, { start: number; end: number }> = {
    listening: { start: 0, end: 6 },
    reading: { start: 6, end: 10 },
    writing: { start: 10, end: 12 },
    speaking: { start: 12, end: 20 },
  };

  const getPartsForSection = (route: string) => {
    const range = sectionRanges[route];
    if (!range) return [] as { title: string; index: number }[];
    const slice = PRACTICE_PARTS.slice(range.start, range.end);
    return slice.map((title, i) => ({ title, index: range.start + i + 1 }));
  };

  return (
    <div className=" mx-auto w-full h-full  p-2  transition-all duration-300 flex gap-5">
      {freeUser ? (
        showModal && <UpgradeModal setShowModal={setShowModal} />
      ) : noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}
      <div className="flex flex-col w-full">
        <div>
          <div
            className={`z-[999] fixed inset-0 flex items-center justify-center px-[14px] screen744:!px-[16px] screen1280:!px-[20px] transition-opacity ${menuShowModal
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
              }`}
          >
            <div
              ref={ref}
              className={`max-w-[725px] w-full h-[90vh] screen1280:!h-[828px] p-[24px] bg-white rounded-[16px] transform transition-all duration-300 ease-out overflow-y-auto ${menuShowModal
                ? "scale-100 translate-y-0"
                : "scale-95 translate-y-2"
                }`}
            >
              <div className="w-full flex flex-col screen1280:!flex-row gap-[16px]">
                {practiceSections.map((section) => (
                  <div
                    key={section.title}
                    className="flex w-full screen1280:!max-w-[220px] flex-col gap-4"
                  >
                    <div
                      className={`flex  justify-center rounded-[12px] items-center h-[60px] ${section.color} ${section.bgColor}`}
                    >
                      {section.icon}
                      <h2 className="text-[16px] screen1280:!text-[16px] text-[#37465C] font-semibold ml-2">
                        {section.title}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 screen744:!grid-cols-2 screen1280:!grid-cols-1 gap-[16px] mb-[16px]">
                      {getPartsForSection(section.route).map((p) => {
                        return (
                          <button
                            key={p.index}
                            onClick={() => {
                              setShowModal(false);
                              router.push(
                                `/exams/exam_${examId}/part${p.index.toString()}`
                              );
                            }}
                            className={`${partId === p.index ? "bg-[#F7F9FF]" : "bg-white"
                              } w-full min-h-[60px] cursor-pointer  h-auto text-left border border-[#D5D6D8]  hover:bg-[#F7F9FF] transition-colors rounded-[12px] p-[12px]`}
                          >
                            <div className="text-[14px] text-[#37465C] font-medium leading-[28px]">
                              {p.title}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col screen744:!flex-row flex-wrap  justify-between my-[24px] w-full h-auto min-h-[56px] gap-[20px]">
            <div className="flex gap-[10px]  screen744:!gap-[40px] items-center">
              <span className="shrink-0">
                Exam{" "}
                {(examName ?? "").replace(/Mock\s+(Set|Test)/gi, "").trim()}
              </span>
              <div className="flex gap-[10px]">
                <a
                  className="relative rounded-[24px] flex-wrap px-[16px] shrink-0   text-[14px] font-normal border-[1px] bg-white flex items-center justify-center border-[#76808F] max-w-[186px] w-full h-[40px]"
                  href={`/exams/exam_${examId}/results?partNumber=part${partNumber}${searchParams.get("attemptId") && searchParams.get("attemptId") !== "null" ? `&attemptId=${searchParams.get("attemptId")}` : ""}`}
                >
                  <span className="flex">View Answers &amp; Score</span>
                </a>
                <AskBeavoButton />
              </div>
            </div>
            <div
              onClick={() => setMenuShowModal(true)}
              className="max-w-[442px] justify-between cursor-pointer border px-[16px] border-[#D5D6D8] rounded-[12px] gap-[4px] w-full flex items-center h-[56px]"
            >
              <div className="text-[#37465C] text-[16px]">
                <span className="font-normal">Writing Part{partId}:</span>
                <span className="font-bold">{PRACTICE_PARTS[partId - 1]}</span>
              </div>
              <SvgChevronDownExam className="text-[#37465C]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl flex flex-col screen1280:!h-[920px] overflow-scroll border border-[#D5D6D8] w-full">
          <div className="flex justify-between pb-[21px]  lg:items-center gap-2 lg:gap-0 px-6 py-4 border-b border-[#D5D6D8] lg:flex-row flex-col w-full  h-auto bg-[#FFEBD6]">
            <div className="flex screen744:!items-center flex-col-reverse screen744:!flex-row gap-[16px]">
              <div className="flex gap-2 flex-col screen744:!shrink-0">
                <span>{PRACTICE_PARTS[partId - 1]}</span>
                <span className="font-normal text-[14px] text-[#37465C]">
                  Writing Task {partId - 10}
                </span>
              </div>
            </div>
            {
              <div className="flex items-center gap-2 justify-end pb-[10px] ">
                {shouldShowPractice && page === "question" && (
                  <div className="flex justify-center items-center lg:flex-row flex-col">
                    <div className="text-[14px] font-semibold gap-2 text-center text-[#EE4266] flex items-center">
                      <p>
                        {time > 0
                          ? `${Math.floor(time / 60)}:${time % 60 < 10 ? `0${time % 60}` : time % 60
                          }`
                          : "Time's Up!"}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    const query = section ? `?section=${section}` : "";
                    if (page == "description" && passageIndex == 0) {
                      if (partId === 1 || (section === "writing" && partId === 11)) {
                        router.push("/exam-overview");
                      } else {
                        router.push(
                          "/exams/exam_" +
                          practice.taskId +
                          "/part" +
                          (partId - 1).toString() +
                          query
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
                        query
                      );
                    }
                    setTime(1620);
                  }}
                  className="cursor-pointer inline-flex items-center justify-center border-[1px] border-[#37465C] rounded-[100%]  w-[40px] h-[40px]"
                >
                  <ArrowLeft size={18} strokeWidth={1.7}></ArrowLeft>
                </button>
                <button
                  onClick={() => {
                    const query = section ? `?section=${section}` : "";
                    if (page == "description") {
                      setPage("question");
                    } else if (page == "question") {
                      if (section === "writing" && partId >= 12) {
                        router.push(`/exams/exam_${practice.taskId}/results`);
                      } else {
                        router.push(
                          "/exams/exam_" +
                          practice.taskId +
                          "/part" +
                          (partId + 1).toString() +
                          query
                        );
                      }
                    }
                    setTime(1620);
                  }}
                  className={
                    "cursor-pointer flex items-center gap-[8px] justify-center h-[40px] font-normal text-[#212E42] text-[14px] w-[96px] bg-white rounded-[24px]"
                  }
                >
                  {section === "writing" && partId >= 12 ? "Finish Exam" : "Next"}
                  <SvgArrowRight />
                </button>
              </div>
            }
          </div>
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
                              setPremiumPlanModalState();
                            } else if (!shouldShowPractice) {
                              setPremiumPlanModalState();
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
                              const query = section
                                ? `?section=${section}`
                                : "";
                              if (section === "writing" && partId >= 12) {
                                setShowContinueModal(true);
                              } else {
                                if (partId >= 12) {
                                  router.push(
                                    "/exams/exam_" +
                                    practice.taskId +
                                    "/part13" +
                                    query
                                  );
                                } else {
                                  router.push(
                                    "/exams/exam_" +
                                    practice.taskId +
                                    "/part" +
                                    (partId + 1).toString() +
                                    query
                                  );
                                }
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
                          <LoaderCircle className="w-8 h-8 text-gray-800 animate-spin"></LoaderCircle>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
      {showContinueModal && (
        <ContinueExamModal
          onContinue={() => {
            setShowContinueModal(false);
            router.push(
              `/exams/exam_${practice.taskId}/part13?section=speaking`
            );
          }}
          onFinish={() => {
            setShowContinueModal(false);
            router.push(`/exam-overview`);
          }}
          nextSectionName="Speaking"
        />
      )}
    </div>
  );
};

export default WritingExamView;
