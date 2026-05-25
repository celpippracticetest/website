import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import NextImage from "next/image";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { TPracticeDto, TPracticeNavItem } from "@/models/practice.model";
import ListeningSideMenu from "../listening-practice/ListeningSideMenu";
import ListeningAnswerList from "./components/ListeningAnswers";
import { TPassage } from "@/models/listenExam.model";
import { useRouter } from "nextjs-toploader/app";
import { useEffect } from "react";
import ReadingQuestionList from "./components/ReadingQuestionList";
import { Popover } from "radix-ui";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import React from "react";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import LoginModal from "@/components/modal/LoginModal";
import { PricingNavModal } from "@/components/pages/pricing/PricingNavModal";
import { usePricingNavModal } from "@/hooks/usePricingNavModal";
import { SupabaseAuthForm } from "@/components/auth/SupabaseAuthForm";
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgCircle from "@/components/icons/Circle";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { runPracticeSubmitSideEffects } from "@/lib/practiceSubmitSideEffects";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";
import StatBadge from "@/components/shared/StatBadge";
import { usePracticeCount } from "@/hooks/usePracticeCount";
import { ActivityLogger } from "@/lib/userActivity";
import { practicePath } from "@/lib/practiceRoutes";

interface ReadingPracticeViewProps {
  practice: TPracticeDto;
  task: TTaskSchemaDto;
  allPractices: TPracticeNavItem[];
  selectedPracticeId: string | null;
  selectedTaskId: string | null;
  previousAnswer: TListeningAndReadingAnswerDto | null;
  completedPractice: string[];
  onBackClick: () => void;
  /** When using path-based URL; PracticeSubChrome already shows breadcrumbs. */
  hideLegacyBreadcrumb?: boolean;
}

const ReadingPracticeView = ({
  practice,
  task,
  allPractices,
  selectedPracticeId,
  selectedTaskId,
  previousAnswer,
  completedPractice,
  onBackClick,
  hideLegacyBreadcrumb,
}: ReadingPracticeViewProps) => {
  const practiceCount = usePracticeCount(task.id, practice.id, task.taskNumber);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
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
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const timerTime = practice.taskId === "67f168222f0ca7f9a751ed3d" ? 780 : 660;
  const { open: pricingModalOpen, setOpen: setPricingModalOpen, openPricingModal } =
    usePricingNavModal();
  const router = useRouter();

  useEffect(() => {
    setPointsAwarded(false);
  }, [selectedPracticeId]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [page, setPage] = useState("question");
  const [passageIndex, setPassageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionIndexInPractice, setQuestionIndexInPractice] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [time, setTime] = useState(timerTime);
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
    setQuestionIndexInPractice(0);
    setPassageIndex(0);
    setQuestionIndex(0);

    const applySavedAnswers = (saved: Record<string, string> | null) => {
      if (saved && Object.keys(saved).length > 0) {
        setSelectedAnswers(saved);
      } else {
        setSelectedAnswers({});
      }
      setPage("question");
    };

    if (!user || !selectedPracticeId) {
      applySavedAnswers(null);
    } else {
      const serverPracticeId = previousAnswer?.practiceId;
      const useServerAnswer =
        previousAnswer != null &&
        serverPracticeId != null &&
        serverPracticeId === selectedPracticeId;

      if (useServerAnswer) {
        const saved =
          previousAnswer.answers && Object.keys(previousAnswer.answers).length > 0
            ? previousAnswer.answers
            : null;
        applySavedAnswers(saved);
      } else {
        void (async () => {
          try {
            const response = await fetch(
              `/api/answers?practiceId=${selectedPracticeId}&userId=${user.id}&type=${practice.type}`,
              { credentials: "include" }
            );
            if (response.ok) {
              const data = await response.json();
              const raw = data.answers as Record<string, string> | undefined;
              const saved =
                raw && Object.keys(raw).length > 0 ? raw : null;
              applySavedAnswers(saved);
              return;
            }
            applySavedAnswers(null);
          } catch {
            applySavedAnswers(null);
          }
        })();
      }
    }

    // Log practice started
    if (user && selectedPracticeId) {
      const attemptId = `practice_${selectedPracticeId}_${Date.now()}`;
      void ActivityLogger.practiceStarted(attemptId, selectedPracticeId, "Reading").catch(
        () => {}
      );
    }
  }, [selectedPracticeId, user, previousAnswer, practice.type]);
  useEffect(() => {
    if (page === "answer" && user) {
      const submitAnswers = async () => {
        try {
          const response = await fetch("/api/answers", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              practiceId: practice.id,
              answers: selectedAnswers,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            runPracticeSubmitSideEffects({
              practiceId: practice.id,
              skill: "Reading",
              overallScore: result.overall ?? 0,
              result,
              durationSeconds: time,
              pointsAwarded,
              addPoints,
              checkTrophyAchievements,
              onPointsAwarded: () => setPointsAwarded(true),
            });
          }
        } catch (error) {
          // Optionally handle error
          console.error("Failed to submit answers:", error);
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

  if (!isLoaded || (user && user.publicMetadata?.plan === undefined)) {
    return (
      <div className="text-center py-10 text-gray-500 w-full">Loading...</div>
    );
  }

  const shouldShowPractice: any =
    practice.isFree ||
    (!practice.isFree &&
      hasPaidPracticeAccess(
        user?.publicMetadata.plan as string | undefined,
        user?.publicMetadata.purchaseDate as string | undefined
      ));
  return (
    <div className="">
      {noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}
      {showSignUpModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 px-4">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow hover:bg-slate-100"
              onClick={() => setShowSignUpModal(false)}
              aria-label="Close sign up modal"
            >
              ×
            </button>
            <SupabaseAuthForm className="shadow-xl" initialMode="sign-up" />
          </div>
        </div>
      )}
      {!hideLegacyBreadcrumb && (
        <div className="w-full min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 pl-0 screen744:pl-[40px] text-[#76808F] text-[14px] mt-0 mb-[28px]">
          <div
            className="cursor-pointer"
            onClick={() => {
              router.push("/practice-overview");
            }}
          >
            Practice
          </div>
          <SvgChevronRightForTitle />
          <div
            className="cursor-pointer"
            onClick={() => {
              router.push("/reading");
            }}
          >
            Reading
          </div>
          <SvgChevronRightForTitle />
          <span className="min-w-0 max-w-full break-words text-[#212E42]">
            <span className="text-[#76808F]">
              {task.taskNumber?.replace(" #", "")}
            </span>
            .{task.name}
          </span>
        </div>
      )}
      <div className="mx-auto w-full flex-col screen1280:!flex-row transition-all duration-300 flex gap-[20px]">
        <ListeningSideMenu
          allPractices={allPractices}
          task={task}
          practice={practice}
          isCompleted={false}
          isPlaying={isPlaying}
          onBackClick={onBackClick}
          selectedPracticeId={selectedPracticeId}
          selectedTaskId={selectedTaskId}
          completedPractice={completedPractice}
        />
        <Card className="bg-white/90 flex min-h-0 flex-col overflow-hidden border border-[#D5D6D8] w-full screen1280:!h-[920px]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 px-6 py-4 border-b border-[#D5D6D8] w-full min-w-0 h-auto bg-[#FFEBD6]">
            <div className="flex w-full min-w-0 flex-col items-start gap-2 lg:flex-1 lg:w-auto lg:min-w-0">
              <h1 className="text-[18px] font-bold text-[#212E42] break-words w-full">
                {practice.passages[passageIndex].title}
              </h1>
              <StatBadge
                count={practiceCount}
                label="answered today"
              />
            </div>
            <div className="flex w-full min-w-0 shrink-0 flex-row flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-[10px] lg:w-auto lg:min-w-fit lg:flex-none lg:gap-2 lg:overflow-visible lg:pb-0">
            {page !== "answer" && shouldShowPractice && (
                  <button
                      onClick={async () => {
                        if (page == "question" && shouldShowPractice) {
                          setTime(30);
                          let answersData: Record<string, string> | null = null;
                          if (user?.id) {
                            try {
                              const getRes = await fetch(
                                `/api/answers?practiceId=${practice.id}&userId=${user.id}&type=${practice.type}`,
                                { credentials: "include" }
                              );
                              if (getRes.ok) {
                                const json = await getRes.json();
                                const raw = json.answers as
                                  | Record<string, string>
                                  | undefined;
                                answersData =
                                  raw && Object.keys(raw).length > 0 ? raw : null;
                              }
                            } catch (err) {
                              console.error(
                                "Error checking existing answers:",
                                err
                              );
                            }
                            if (!answersData) {
                              try {
                                const postRes = await fetch("/api/answers", {
                                  method: "POST",
                                  credentials: "include",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    practiceId: practice.id,
                                    answers: selectedAnswers,
                                  }),
                                });
                                let postJson: {
                                  result?: { answers?: Record<string, string> };
                                } = {};
                                try {
                                  postJson = await postRes.json();
                                } catch {
                                  /* non-JSON body */
                                }
                                answersData =
                                  postJson.result?.answers ??
                                  (postRes.ok ? selectedAnswers : null);
                              } catch (err) {
                                console.error("Failed to save answers:", err);
                              }
                            }
                          } else {
                            answersData = selectedAnswers;
                          }
                          if (answersData) {
                            setSelectedAnswers(answersData);
                          }
                          setPage("answer");
                        } else if (
                          page === "answer" ||
                          (page == "question" && !shouldShowPractice)
                        ) {
                          const practiceIndex = allPractices.findIndex(
                            (p) => p.id == selectedPracticeId
                          );
                          if (practiceIndex < allPractices.length - 1 && selectedTaskId) {
                            setPage("question");
                            router.push(
                              practicePath(
                                "reading",
                                allPractices[practiceIndex + 1].id,
                                selectedTaskId
                              )
                            );
                          } else {
                          }
                          setTime(30);
                        }
                      }}
                      className={`cursor-pointer shrink-0 border border-[#76808F] px-[24px] text-[14px] font-normal h-[40px] rounded-[24px] ${page !== "answer" && shouldShowPractice
                        ? "bg-white"
                        : "bg-white"
                        }`}
                    >
                      <span className="hidden screen1280:!flex">
                        View Answers &amp; Score
                      </span>
                      <span className="flex screen1280:!hidden"> Score</span>{" "}
                    </button>
            )}
            {page !== "answer" && shouldShowPractice && (
              <>
                {shouldShowPractice && page === "question" && (
                  <div className="flex shrink-0 justify-center items-center lg:flex-row flex-col">
                    <div className="text-[14px] shrink-0 font-semibold gap-2 text-center text-[#EE4266] flex items-center">
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
                  type="button"
                  onClick={() => {
                    const practiceIndex = allPractices.findIndex(
                      (p) => p.id == selectedPracticeId
                    );
                    if (practiceIndex > 0 && selectedTaskId) {
                      setPage("question");
                      router.push(
                        practicePath(
                          "reading",
                          allPractices[practiceIndex - 1].id,
                          selectedTaskId
                        )
                      );
                    }
                    setTime(timerTime);
                  }}
                  className="cursor-pointer inline-flex border border-[#37465C] shrink-0 items-center h-[40px] w-[40px] rounded-[100%] justify-center min-h-[40px]"
                >
                  <ArrowBack sx={{ fontSize: 18 }} />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setTime(30);
                    if (Object.keys(selectedAnswers).length > 0 && user) {
                      try {
                        const saveRes = await fetch("/api/answers", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            practiceId: practice.id,
                            answers: selectedAnswers,
                          }),
                        });

                        if (saveRes.ok && !pointsAwarded) {
                          runPracticeSubmitSideEffects({
                            practiceId: practice.id,
                            skill: "Reading",
                            overallScore: 100,
                            result: { overall: 100 },
                            durationSeconds: time,
                            pointsAwarded,
                            addPoints,
                            checkTrophyAchievements,
                            onPointsAwarded: () => setPointsAwarded(true),
                          });
                        }
                      } catch (err) {
                        console.error(
                          "Failed to save answers before navigating:",
                          err
                        );
                      }
                    }
                    if (
                      page === "answer" ||
                      (page === "question" && !shouldShowPractice) ||
                      (page === "question" && shouldShowPractice)
                    ) {
                      const practiceIndex = allPractices.findIndex(
                        (p) => p.id == selectedPracticeId
                      );
                      if (practiceIndex < allPractices.length - 1 && selectedTaskId) {
                        setPage("question");
                        router.push(
                          practicePath(
                            "reading",
                            allPractices[practiceIndex + 1].id,
                            selectedTaskId
                          )
                        );
                      }
                    }
                  }}
                  className="cursor-pointer shrink-0 border border-[#76808F] px-[24px] text-[14px] font-normal h-[40px] rounded-[24px] bg-white"
                >
                  Next
                </button>
              </>
            )}
            {(page === "answer" || !shouldShowPractice) && (
              <>
                {shouldShowPractice && page === "question" && (
                  <div className="flex shrink-0 justify-center items-center lg:flex-row flex-col">
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
                  type="button"
                  hidden={page !== "answer"}
                  onClick={() => {
                    if (page == "answer") {
                      setPage("question");
                    }
                    setTime(timerTime);
                  }}
                  className="cursor-pointer inline-flex border border-[#37465C] shrink-0 items-center h-[40px] w-[40px] rounded-[100%] justify-center min-h-[40px]"
                >
                  <ArrowBack sx={{ fontSize: 18 }} />
                </button>
              </>
            )}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full">
            {page == "question" && (
              <div className="h-full overflow-hidden ">
                <div className="grid screen1280:grid-cols-2 grid-cols-1 h-full w-full">
                  <div className="p-[16px] screen744:!p-[24px] overflow-y-scroll border-r-0 border-b screen1280:!border-none border-slate-300 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
                    <div className="relative">
                      {practice.passages[0].pictureUrl && (
                        <>
                          <p className="text-[14px] text-gray-400 mb-2">
                            Read the following Message, Photo or Diagram
                          </p>
                          <NextImage
                            src={practice.passages[0].pictureUrl}
                            alt={practice.passages[0].title}
                            width={800}
                            height={500}
                            className={`w-full h-auto mb-4 rounded-lg shadow-md ${!shouldShowPractice ? "blur-sm" : ""}`}
                            loading="lazy"
                            unoptimized
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
                            <p className="whitespace-pre-line text-[14px] text-[#212E42] font-medium ">
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
                          {noUser ? (
                            <Button
                              variant="outline"
                              className="flex mt-[32px] gap-[8px] text-white items-center text-[14px] font-normal justify-center cursor-pointer rounded-[24px] bg-[#4A7DFF]"
                              onClick={() => setShowSignUpModal(true)}
                            >
                              Sign up to continue
                              <SvgArrowRight />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="flex mt-[32px] gap-[8px] text-white items-center text-[14px] font-normal justify-center cursor-pointer rounded-[24px] bg-[#4A7DFF]"
                              aria-label="Next testimonial"
                              onClick={() => {
                                if (freeUser) {
                                  openPricingModal();
                                } else {
                                  setShowLoginModal(true);
                                }
                              }}
                            >
                              Upgrade to Pro
                              <SvgArrowRight />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-[16px] screen744:!p-[24px] overflow-y-scroll [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
                    <div className="flex flex-col gap-4">
                      {practice.passages[0]?.questions?.map((question, index) => (
                        <ReadingQuestionList
                          key={index}
                          questionIndex={index}
                          totalQuestions={practice.totalQuestion ?? 0}
                          question={question}
                          onAnswerSelect={(
                            questionId: number,
                            answerId: string
                          ) => {
                            if (shouldShowPractice) {
                              handleAnswerSelect(questionId, answerId);
                            } else {
                              openPricingModal();
                            }
                          }}
                          selectedAnswers={selectedAnswers}
                        />
                      ))}
                      {practice.passages[1] && practice.passages[1].body && (
                        <>
                          <p className="font-semibold text-slate-900 mt-4">
                            {practice.passages[1].title}
                          </p>
                          <p className="text-[#212E42] mb-6 bg-white p-4 text-[14px] leading-7  font-medium  whitespace-pre-line">
                            {practice.passages[1] &&
                              practice.passages[1].body &&
                              practice.passages[1].body
                                ?.split("${Q}")
                                .map((p, index, arr) => (
                                  <React.Fragment key={index}>
                                    {p}
                                    {index !== arr.length - 1 && (
                                      <Popover.Root>
                                        <Popover.Trigger className="PopoverTrigger inline-flex items-center justify-start gap-x-1 min-w-[148px] max-w-full px-4 py-1 rounded bg-[#F7B267] cursor-pointer font-semibold text-[#212E42] text-[14px]">
                                          {parseInt(
                                            practice.passages[1]?.questions?.[0]?.id ?? "0"
                                          ) + index}
                                          {selectedAnswers[
                                            (practice.passages[0]?.questions
                                              ?.length ?? 0) + index
                                          ]
                                            ? ". " +
                                            practice.passages[1]?.questions?.[
                                              index
                                            ]?.choices?.find(
                                              (choice) =>
                                                choice.id ===
                                                selectedAnswers[
                                                (practice.passages[0]
                                                  ?.questions?.length ?? 0) + index
                                                ]
                                            )?.text
                                            : "..."}
                                        </Popover.Trigger>
                                        <Popover.Portal>
                                          <Popover.Content
                                            className="PopoverContent z-20 rounded-md border bg-popover text-popover-foreground shadow-md outline-none  w-80 p-2"
                                            sideOffset={5}
                                          >
                                            <div className="flex flex-col">
                                              <p className="text-[14px] font-medium mb-2"></p>
                                              {practice.passages[1]?.questions?.[
                                                index
                                              ]?.choices?.map(
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
                                                            (practice.passages[0]
                                                              ?.questions
                                                              ?.length ?? 0) + index,
                                                            choice.id
                                                          );
                                                        } else {
                                                          openPricingModal();
                                                        }
                                                      }}
                                                    >
                                                      {selectedAnswers[
                                                        (practice.passages[0]
                                                          ?.questions?.length ?? 0) +
                                                        index
                                                      ] === choice.id ? (
                                                        <SvgCheckCircle className=" shrink-0 mr-2" />
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
                        practice.passages[2].questions &&
                        practice.passages[2].questions?.length > 0 &&
                        practice.passages[2].questions.map(
                          (question, index) => (
                            <ReadingQuestionList
                              key={index}
                              questionIndex={
                                (practice.passages[0]?.questions?.length ?? 0) +
                                (practice.passages[1]?.questions?.length ?? 0) +
                                index
                              }
                              totalQuestions={practice.totalQuestion ?? 0}
                              question={question}
                              onAnswerSelect={(
                                questionId: number,
                                answerId: string
                              ) => {
                                if (shouldShowPractice) {
                                  handleAnswerSelect(
                                    (practice.passages[0]?.questions?.length ?? 0) +
                                    (practice.passages[1]?.questions?.length ?? 0) +
                                    index,
                                    answerId
                                  );
                                } else {
                                  openPricingModal();
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
            {page == "answer" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto w-full pb-[50px] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100">
                <ListeningAnswerList
                  questionIndex={questionIndex}
                  questions={practice.passages.reduce(
                    (current: Array<any>, passage: TPassage) => {
                      return current.concat(passage.questions);
                    },
                    []
                  )}
                  onAnswerSelect={() => { }}
                  selectedAnswers={selectedAnswers}
                />
              </div>
            )}
          </div>
        </Card>
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

export default ReadingPracticeView;
