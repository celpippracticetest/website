"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { TPracticeDto } from "@/models/practice.model";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import ReadingQuestionList from "../reading-practice/components/ReadingQuestionList";
import useStore from "@/store";
import { Popover } from "radix-ui";
import { useUser } from "@clerk/nextjs";
import React from "react";
import SvgArrowRight from "@/components/icons/ArrowRight";
import UpgradeModal from "@/components/modal/UpgradeModal";
import LoginModal from "@/components/modal/LoginModal";
import SvgCircle from "@/components/icons/Circle";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgListeningPart from "@/components/icons/ListeningPart";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
import SvgWritingPart from "@/components/icons/WritingPart";
import SvgReadingPart from "@/components/icons/ReadingPart";
import { ActivityLogger } from "@/lib/userActivity";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";
import { PRACTICE_PARTS } from "@/constants";
import ContinueExamModal from "@/components/modal/ContinueExamModal";
import ExamHeader from "./components/ExamHeader";

interface ReadingExamViewProps {
  practice: TPracticeDto;
  partId: number;
  examId?: string;
  examName?: string;
  partNumber?: string;
  examNumber?: number;
}

const ReadingExamView = ({
  practice,
  partId,
  examId,
  examName,
  partNumber,
  examNumber,
}: ReadingExamViewProps) => {
  const timerTime = partId == 10 ? 780 : 660;
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");

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
  const [page, setPage] = useState(partId == 7 ? "description" : "question");
  const [passageIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [time, setTime] = useState(timerTime);
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
      const loggerAttemptId = searchParams.get("attemptId") || `mock_${practice.taskId}_${Date.now()}`;
      ActivityLogger.mockStarted(loggerAttemptId, practice.taskId.toString());
    }
  }, [user, practice.taskId, searchParams]);

  useEffect(() => {
    if (page === "answer" && user) {
      const submitAnswers = async () => {
        try {
          const response = await fetch("/api/exams/answers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              examId: practice.taskId,
              partId: partId,
              answers: selectedAnswers,
              attemptId: searchParams.get("attemptId"),
            }),
          });

          if (response.ok) {
            const result = await response.json();
            // Log mock exam part completed
            const loggerAttemptId = searchParams.get("attemptId") || `mock_${practice.taskId}_${Date.now()}`;
            await ActivityLogger.mockCompleted(
              loggerAttemptId,
              practice.taskId.toString(),
              result.overall,
              result,
              time
            );

            // Add league points for mock exam completion
            await addPoints(
              20,
              "mockExams",
              `${Math.floor(time / 60)} minutes`
            );

            // Check for trophy achievements (only for complete exam mode)
            if (!section) {
              await checkTrophyAchievements(
                20,
                "mockExams",
                `${Math.floor(time / 60)}:${time % 60}`
              );
            }
          }
        } catch (error) {
          // Optionally handle error
          console.error("Failed to submit answers:", error);
        }
        const attemptId = searchParams.get("attemptId");
        const query = section ? `?section=${section}&attemptId=${attemptId}` : `?attemptId=${attemptId}`;
        if (section === "reading" && partId >= 10) {
          setShowContinueModal(true);
        } else {
          const attemptId = searchParams.get("attemptId");
          const query = section ? `?section=${section}&attemptId=${attemptId}` : `?attemptId=${attemptId}`;
          router.push(
            "/exams/exam_" +
            practice.taskId +
            "/part" +
            (partId + 1).toString() +
            query
          );
        }
      };

      submitAnswers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user]);

  const handleAnswerSelect = (questionId: number, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const shouldShowPractice: boolean =
    practice.isFree ||
    !!(!practice.isFree &&
      user &&
      user.publicMetadata.plan &&
      user.publicMetadata.plan === "premium");

  if (isLoaded && (!user || (user && user.publicMetadata.plan !== "premium"))) {
    router.push("exam-overview");
  }

  const [menuShowModal, setMenuShowModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
    <div className="w-full p-2  transition-all duration-300 flex gap-5">
      {freeUser ? (
        showModal && <UpgradeModal setShowModal={setShowModal} />
      ) : noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}
      <div className="flex flex-col w-full">

        <ExamHeader examPractice="Reading" ref={ref} setShowModal={setMenuShowModal} menuShowModal={menuShowModal} examId={practice.taskId} partId={partId} examName={practice.name} examNumber={examNumber} practiceSections={practiceSections} getPartsForSection={getPartsForSection} />

        <div className="bg-white rounded-xl flex flex-col screen1280:!h-[920px] overflow-scroll border border-[#D5D6D8] w-full">
          <div className="flex justify-between pb-[21px]  lg:items-center gap-2 lg:gap-0 px-6 py-4 border-b border-[#D5D6D8] lg:flex-row flex-col w-full  h-auto bg-[#FFEBD6]">
            <div className="flex screen744:!items-center flex-col-reverse screen744:!flex-row gap-[16px]">
              <div className="flex gap-2 flex-col screen744:!shrink-0 shrink-0">
                <span>{PRACTICE_PARTS[partId - 1]}</span>
                <span className="font-normal text-[14px] text-[#37465C]">
                  Reading Task {partId - 6}
                </span>
              </div>
            </div>
            {
              <div className="flex items-center gap-2 pb-[10px] justify-end">
                {shouldShowPractice && page === "question" && (
                  <div className="flex justify-center items-center lg:flex-row flex-col">
                    <div className="text-base font-semibold gap-2 text-center text-[#EE4266] flex items-center">
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
                  disabled={page == "answer"}
                  onClick={() => {
                    const query = section ? `?section=${section}` : "";
                    if (page == "description" && passageIndex == 0) {
                      if (partId === 1 || (section === "reading" && partId === 7)) {
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
                    } else if (page == "question" && partId === 7) {
                      setPage("description");
                    } else if (page == "question") {
                      router.push(
                        "/exams/exam_" +
                        practice.taskId +
                        "/part" +
                        (partId - 1).toString() +
                        (query ? query + "&" : "?") + `attemptId=${searchParams.get("attemptId")}`
                      );
                    }
                    setTime(timerTime);
                  }}
                  className="cursor-pointer inline-flex items-center justify-center border-[1px] border-[#37465C] rounded-[100%]  w-[40px] h-[40px]"
                >
                  <ArrowLeft size={18} strokeWidth={1.7}></ArrowLeft>
                </button>
                <button
                  disabled={page == "answer"}
                  onClick={() => {
                    if (page == "description") {
                      setPage("question");
                    } else if (page == "question") {
                      setPage("answer");
                    }
                    setTime(timerTime);
                  }}
                  className={
                    "cursor-pointer flex items-center gap-[8px] justify-center h-[40px] font-normal text-[#212E42] text-[14px] w-[96px] bg-white rounded-[24px]"
                  }
                >
                  Next
                  <SvgArrowRight />
                </button>
              </div>
            }
          </div>
          <div className="flex flex-col h-full overflow-hidden w-full">
            {page == "answer" && (
              <div className="flex flex-col justify-center items-center grow p-4  overflow-y-scroll [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                <div className="flex flex-col items-center justify-center mx-auto space-y-2 w-full">
                  <div className="text-center text-base font-medium text-gray-800 mb-2 w-full">
                    Upload Answers...
                  </div>
                  <LoaderCircle className="w-8 h-8 text-gray-800 animate-spin"></LoaderCircle>
                </div>
              </div>
            )}
            {page == "description" && (
              <div className="p-6">
                <p className="text-lg font-bold text-gray-800 mb-2">
                  What is this part?
                </p>
                <div className="prose max-w-none text-base marker:text-blue-600">
                  <ul>
                    <li>You will read four separate passages.</li>
                    <li>
                      For each passage, questions will appear on the right side
                      of the screen.
                    </li>
                    <li>
                      Select the most appropriate answer for each question..
                    </li>
                  </ul>
                </div>
              </div>
            )}
            {page == "question" && (
              <div className="h-full overflow-hidden ">
                <div className="grid lg:grid-cols-2 grid-cols-1 h-full w-full">
                  <div className="p-4 overflow-y-scroll lg:border-r border-r-0 border-b lg:border-b-0 border-slate-300 [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                    <div className="relative">
                      {practice.passages[0].pictureUrl && (
                        <>
                          <p className="text-[14px] text-gray-400 mb-2">
                            Read the following Message, Photo or Diagram
                          </p>
                          <img
                            src={practice.passages[0].pictureUrl}
                            alt={practice.passages[0].title}
                            className={`w-full h-auto mb-4 rounded-lg shadow-md ${!shouldShowPractice ? "blur-sm" : ""
                              }`}
                          />
                        </>
                      )}
                      {practice.passages[0].body &&
                        practice.passages[0].body?.length > 30 && (
                          <>
                            {!practice.passages[0].pictureUrl && (
                              <p className="text-[14px] text-gray-400 mb-2">
                                Read the following Message
                              </p>
                            )}
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
                          </>
                        )}

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
                  <div className="p-4  overflow-y-scroll [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                    <div className="flex flex-col gap-4">
                      {practice.passages[0].questions?.map(
                        (question, index) => (
                          <ReadingQuestionList
                            key={index}
                            questionIndex={index}
                            totalQuestions={practice.totalQuestion || 0}
                            question={question}
                            onAnswerSelect={(
                              questionId: number,
                              answerId: string
                            ) => {
                              if (shouldShowPractice) {
                                handleAnswerSelect(questionId, answerId);
                              } else {
                                setPremiumPlanModalState();
                              }
                            }}
                            selectedAnswers={selectedAnswers}
                          />
                        )
                      )}
                      {practice.passages[1]?.body &&
                        practice.passages[1]?.body?.length > 0 && (
                          <>
                            <p className="font-semibold text-slate-900 mt-4">
                              {practice.passages[1]?.title}
                            </p>
                            <p className="text-[#212E42] mb-6 p-4  text-[14px] leading-7  font-medium  whitespace-pre-line">
                              {practice.passages[1]?.body &&
                                practice.passages[1]?.body
                                  ?.split("${Q}")
                                  .map((p, index, arr) => (
                                    <React.Fragment key={index}>
                                      {p}
                                      {index !== arr.length - 1 && (
                                        <Popover.Root>
                                          <Popover.Trigger className="PopoverTrigger bg-[#F7B267] cursor-pointer px-2 rounded font-semibold text-[#212E42] text-[14px] py-1">
                                            {parseInt(
                                              practice.passages[1]?.questions?.[0]?.id || "0"
                                            ) + index}
                                            {selectedAnswers[
                                              (practice.passages[0]?.questions?.length || 0) + index
                                            ]
                                              ? ". " +
                                              practice.passages[1]?.questions?.[
                                                index
                                              ]?.choices?.find(
                                                (choice) =>
                                                  choice.id ===
                                                  selectedAnswers[
                                                  (practice.passages[0]?.questions?.length || 0) + index
                                                  ]
                                              )?.text
                                              : "..."}
                                          </Popover.Trigger>
                                          <Popover.Portal>
                                            <Popover.Content
                                              className="PopoverContent rounded-md border bg-popover text-popover-foreground shadow-md outline-none  w-80 p-2"
                                              sideOffset={5}
                                            >
                                              <div className="flex flex-col">
                                                <p className="text-[14px] font-medium mb-2"></p>
                                                {(practice.passages[1]?.questions?.[
                                                  index
                                                ]?.choices || []).map(
                                                  (choice, indexChoice) => (
                                                    <Popover.Close
                                                      asChild
                                                      key={indexChoice}
                                                    >
                                                      <div
                                                        className="flex items-center p-2 rounded-md transition-all cursor-pointer hover:bg-blue-50 "
                                                        onClick={(e) => {
                                                          if (
                                                            shouldShowPractice
                                                          ) {
                                                            handleAnswerSelect(
                                                              (practice.passages[0]?.questions?.length || 0) + index,
                                                              choice.id
                                                            );
                                                          } else {
                                                            setPremiumPlanModalState();
                                                          }
                                                        }}
                                                      >
                                                        {selectedAnswers[
                                                          (practice.passages[0]?.questions?.length || 0) +
                                                          index
                                                        ] === choice.id ? (
                                                          <SvgCheckCircle className="shrink-0 mr-2" />
                                                        ) : (
                                                          <SvgCircle className="shrink-0 mr-2" />
                                                        )}
                                                        <span className="text-[14px] ml-2">
                                                          {choice.text}
                                                        </span>
                                                      </div>
                                                    </Popover.Close>
                                                  )
                                                )}
                                              </div>
                                              <Popover.Arrow className="PopoverArrow" />
                                            </Popover.Content>
                                          </Popover.Portal>
                                        </Popover.Root>
                                      )}
                                      {/* {index !== arr.length - 1 && (
                                  <span
                                    className="bg-blue-200 cursor-pointer px-2 rounded font-semibold text-slate-800 text-[14px] py-1 relative"
                                    type="button"
                                    aria-haspopup="dialog"
                                    aria-expanded="false"
                                    aria-controls={`radix-${index}`}
                                    data-state={isOpen[index] ? "open" : "closed"}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent click events from propagating and closing the modal
                                      setIsOpen((prev) => ({ ...prev, [index]: !prev[index] }));
                                    }}
                                  >
                                    {parseInt(practice.passages[1].questions[0].id) + index}
                                    {selectedAnswers[practice.passages[0].questions.length + index]
                                      ? ". " +
                                        practice.passages[1].questions[index].choices.find(
                                          (choice) =>
                                            choice.id === selectedAnswers[practice.passages[0].questions.length + index]
                                        )?.text
                                      : "..."}
                                    {isOpen[index] && (
                                      <div
                                        className="absolute top-full left-0 z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-80 p-2"
                                        onClick={(e) => {}} // Prevent modal from closing when clicking inside
                                      >
                                        
                                      </div>
                                    )}
                                  </span>
                                )} */}
                                    </React.Fragment>
                                  ))}
                            </p>
                          </>
                        )}
                      {practice.passages[2] &&
                        practice.passages[2].questions &&
                        practice.passages[2].questions?.length > 0 && (
                          <p className="font-semibold text-slate-900 mt-4">
                            Choose the correct answer to the question.
                          </p>
                        )}
                      {practice.passages[2] &&
                        practice.passages[2]?.questions &&
                        (practice.passages[2]?.questions?.length || 0) > 0 &&
                        practice.passages[2]?.questions.map(
                          (question, index) => (
                            <ReadingQuestionList
                              key={index}
                              questionIndex={
                                (practice.passages[0]?.questions?.length || 0) +
                                (practice.passages[1]?.questions?.length || 0) +
                                index
                              }
                              totalQuestions={practice.totalQuestion || 0}
                              question={question}
                              onAnswerSelect={(
                                questionId: number,
                                answerId: string
                              ) => {
                                if (shouldShowPractice) {
                                  handleAnswerSelect(
                                    (practice.passages[0]?.questions?.length || 0) +
                                    (practice.passages[1]?.questions?.length || 0) +
                                    index,
                                    answerId
                                  );
                                } else {
                                  setPremiumPlanModalState();
                                }
                              }}
                              selectedAnswers={selectedAnswers}
                            />
                          )
                        )}
                    </div>
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
              `/exams/exam_${practice.taskId}/part11?section=writing&attemptId=${searchParams.get("attemptId")}`
            );
          }}
          onFinish={() => {
            setShowContinueModal(false);
            router.push(`/exam-overview`);
          }}
          nextSectionName="Writing"
        />
      )}
    </div>
  );
};

export default ReadingExamView;
