import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CircleCheck,
  Circle,
  FileCheck,
  LockOpen,
} from "lucide-react";
import { TPracticeDto } from "@/models/practice.model";
import ListeningSideMenu from "../listening-practice/ListeningSideMenu";
import ListeningAnswerList from "./components/ListeningAnswers";
import { TPassage } from "@/models/listenExam.model";
import { useRouter } from "nextjs-toploader/app";
import { useEffect } from "react";
import ReadingQuestionList from "./components/ReadingQuestionList";
import useStore from "@/store";
import { Popover } from "radix-ui";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import React from "react";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import UpgradeModal from "@/components/modal/UpgradeModal";
import LoginModal from "@/components/modal/LoginModal";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgCircle from "@/components/icons/Circle";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import { trackKpi } from "@/lib/analytics";
import { ActivityLogger } from "@/lib/userActivity";
import StatBadge from "@/components/shared/StatBadge";
import { usePracticeCount } from "@/hooks/usePracticeCount";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import Link from "next/link";
import ObjectivePracticeSubmitButtons from "../practice/ObjectivePracticeSubmitButtons";
import TaskRetakeBanner from "../practice/TaskRetakeBanner";
import { usePracticeSessionAnalytics } from "@/hooks/usePracticeSessionAnalytics";
import { useTimerExpiredAnalytics } from "@/hooks/useTimerExpiredAnalytics";
import {
  buildPracticeUrl,
  retakeTask,
  submitObjectivePracticeAnswers,
} from "@/lib/objectivePracticeSubmit";
import { formatPracticeHtml } from "@/lib/formatPracticeHtml";

interface ReadingPracticeViewProps {
  practice: TPracticeDto;
  task: TTaskSchemaDto;
  allPractices: TPracticeDto[];
  selectedPracticeId: string | null;
  selectedTaskId: string | null;
  previousAnswer: TListeningAndReadingAnswerDto | null;
  completedPractice: string[];
  onBackClick: () => void;
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
}: ReadingPracticeViewProps) => {
  const practiceCount = usePracticeCount(task.id, practice.id, task.taskNumber);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  const freeUser = user?.publicMetadata.plan == "free";
  const noUser = isLoaded ? !isSignedIn : false;
  const [showModal, setShowModal] = useState(false);
  const timerTime = practice.taskId === "67f168222f0ca7f9a751ed3d" ? 780 : 660;
  const router = useRouter();

  const [isPlaying, setIsPlaying] = useState(false);
  const [page, setPage] = useState("question");
  const [passageIndex, setPassageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionIndexInPractice, setQuestionIndexInPractice] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [time, setTime] = useState(timerTime);
  const setPremiumPlanModalState = useStore(
    (state) => state.setPremiumPlanModalState,
  );
  const completedRef = useRef(false);
  const totalQuestionsCount =
    practice.totalQuestion !== undefined
      ? practice.totalQuestion
      : practice.passages.reduce((sum: number, p: TPassage) => {
          return sum + (p.questions?.length ?? 0);
        }, 0);
  useTimerExpiredAnalytics(
    time,
    "reading",
    Math.max(0, totalQuestionsCount - Object.keys(selectedAnswers).length),
  );
  usePracticeSessionAnalytics({
    testId: selectedPracticeId || practice.id,
    module: "reading",
    completedRef,
    getPercentComplete: () =>
      totalQuestionsCount
        ? Math.round(
            (Object.keys(selectedAnswers).length / totalQuestionsCount) * 100,
          )
        : 0,
    getLastQuestionIndex: () => questionIndexInPractice,
  });
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (page === "question" && time > 0) {
      timer = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
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
    completedRef.current = false;

    const fetchPreviousAnswers = async () => {
      if (!user || !selectedPracticeId) return;
      try {
        const response = await fetch(
          `/api/answers?practiceId=${selectedPracticeId}&userId=${user.id}&type=${practice.type}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.answers) {
            setSelectedAnswers(data.answers);
            setPage("answer");
            trackKpi.practiceTestResume({ testId: selectedPracticeId });
            return;
          }
        }
        setSelectedAnswers({});
        setPage("question");
      } catch (error) {
        console.error("Error fetching previous answers:", error);
        setSelectedAnswers({});
        setPage("question");
      }
    };

    fetchPreviousAnswers();

    // Log practice started
    if (user?.id && selectedPracticeId) {
      const attemptId = `practice_${selectedPracticeId}_${Date.now()}`;
      ActivityLogger.practiceStarted(attemptId, selectedPracticeId, "Reading");
    }
    // Depend on user.id only — auth token refresh recreates the user object and
    // would otherwise re-fetch and clear in-progress selections.
  }, [selectedPracticeId, user?.id]);
  useEffect(() => {
    if (page === "answer" && user?.id) {
      const submitAnswers = async () => {
        try {
          const response = await fetch("/api/answers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              practiceId: practice.id,
              answers: selectedAnswers,
            }),
          });

          if (response.ok) {
            completedRef.current = true;
            const result = await response.json();
            // Log practice completed
            const attemptId = `practice_${practice.id}_${Date.now()}`;
            await ActivityLogger.practiceCompleted(
              attemptId,
              practice.id,
              "Reading",
              result.overall,
              result,
              time,
            );
          }
        } catch (error) {
          // Optionally handle error
          console.error("Failed to submit answers:", error);
        }
      };
      submitAnswers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user?.id]);

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
    practice.isFree || hasPaidPracticeAccess(user?.publicMetadata?.plan);

  const practiceIndex = allPractices.findIndex(
    (p) => p.id == selectedPracticeId,
  );
  const isLastPractice = practiceIndex >= allPractices.length - 1;

  const handleSubmitAndSeeResult = async () => {
    if (!user) return;
    setPage("answer");
  };

  const handleSubmitAndNext = async () => {
    if (!user) return;
    await submitObjectivePracticeAnswers({
      practiceId: practice.id,
      answers: selectedAnswers,
      skill: "Reading",
      timeRemaining: time,
    });

    if (practiceIndex < allPractices.length - 1) {
      setPage("question");
      router.push(
        buildPracticeUrl(
          "reading",
          allPractices[practiceIndex + 1].id,
          selectedTaskId,
        ),
      );
      setTime(timerTime);
    }
  };

  const handleRetakeTask = () => {
    if (allPractices.length === 0) return;
    setSelectedAnswers({});
    setPage("question");
    setTime(timerTime);
    retakeTask("reading", allPractices[0].id, selectedTaskId, router);
  };

  return (
    <>
      <div className="w-full transition-all duration-300 flex gap-5 items-center ">
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
          completedPractice={completedPractice}
        />
        <div className="bg-white rounded-xl flex flex-col screen1280:!h-[920px] overflow-scroll border border-[#D5D6D8] w-full">
          <div className="flex justify-between  gap-2 p-[16px] border-b border-[#D5D6D8]  flex-col screen1280:!flex-row w-full  h-auto bg-[#FFEBD6]">
            <div className="flex flex-col-reverse screen744:!flex-row items-start screen744:!items-center gap-[16px] flex-wrap screen744:!flex-nowrap">
              <div className="flex flex-col gap-2 w-full items-start">
                <h1 className="w-full max-w-[330px] text-[18px] font-bold text-[#212E42]">
                  {practice.passages[passageIndex].title}
                </h1>
                <StatBadge count={practiceCount} label="answered today" />
              </div>
            </div>
            {page !== "answer" && shouldShowPractice && (
              <div className="flex justify-between">
                <ObjectivePracticeSubmitButtons
                  onSubmitAndNext={handleSubmitAndNext}
                  onSubmitAndSeeResult={handleSubmitAndSeeResult}
                  showSubmitAndNext={!isLastPractice}
                  disabled={!user || Object.keys(selectedAnswers).length === 0}
                />
                <div className="flex items-center gap-2 justify-end ml-[5px] pl-[32px] pb-[10px] screen1280:!pb-[0]">
                  {shouldShowPractice && page === "question" && (
                    <div className="flex shrink-0 justify-center items-center screen1280:!flex-row flex-col">
                      <div className="text-[14px] shrink-0 font-semibold gap-2 text-center text-[#EE4266] flex items-center">
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

                  <button
                    onClick={() => {
                      if (practiceIndex > 0) {
                        setPage("question");
                        router.push(
                          buildPracticeUrl(
                            "reading",
                            allPractices[practiceIndex - 1].id,
                            selectedTaskId,
                          ),
                        );
                      }
                      setTime(timerTime);
                    }}
                    className="cursor-pointer inline-flex border border-[#37465C] shrink-0 items-center h-[40px] w-[40px] rounded-[100%] justify-center min-h-[40px]"
                  >
                    <ArrowLeft size={18} strokeWidth={1.7}></ArrowLeft>
                  </button>
                </div>
              </div>
            )}

            {(page === "answer" || !shouldShowPractice) && (
              <div className="flex items-center pb-[10px] gap-2 justify-between">
                {shouldShowPractice && page === "question" && (
                  <div className="flex justify-center items-center flex-col">
                    <div className="text-[14px] font-semibold gap-2 text-center text-[#EE4266] flex items-center">
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
                <button
                  hidden={page !== "answer"}
                  onClick={() => {
                    if (page == "answer") {
                      setPage("question");
                    }
                    setTime(timerTime);
                  }}
                  className="cursor-pointer inline-flex border border-[#37465C] shrink-0 items-center h-[40px] w-[40px] rounded-[100%] justify-center min-h-[40px]"
                >
                  <ArrowLeft size={18} strokeWidth={1.7}></ArrowLeft>
                </button>
                {/* <button
                onClick={() => {
                  if (page == "question" && shouldShowPractice) {
                    setPage("answer");
                  } else if (
                    page === "answer" ||
                    (page == "question" && !shouldShowPractice)
                  ) {
                    const practiceIndex = allPractices.findIndex(
                      (p) => p.id == selectedPracticeId
                    );
                    if (practiceIndex < allPractices.length - 1) {
                      const taskUrl = selectedTaskId
                        ? "&taskId=" + selectedTaskId
                        : "";
                      setPage("question");
                      router.push(
                        "/reading?selectedPracticeId=" +
                          allPractices[practiceIndex + 1].id +
                          taskUrl
                      );
                    } else {
                    }
                  }
                  setTime(30);
                }}
                className={`cursor-pointer border border-[#76808F] px-[24px] text-[14px] font-normal h-[40px] rounded-[24px] ${
                  page !== "answer" && shouldShowPractice
                    ? "bg-white"
                    : "bg-white"
                }`}
              >
                Next question
              </button> */}
              </div>
            )}
          </div>
          <div className="flex flex-col h-full overflow-hidden w-full">
            {page == "question" && (
              <div className="h-full overflow-hidden ">
                <div className="grid lg:grid-cols-2 grid-cols-1 h-full w-full">
                  <div className="p-4 overflow-y-scroll  border-r-0 border-b screen1280:!border-none border-slate-300 [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                    <div className="relative">
                      {practice.passages[0].pictureUrl && (
                        <>
                          <p className="text-[14px] text-gray-400 mb-2">
                            Read the following Message, Photo or Diagram
                          </p>
                          <img
                            src={practice.passages[0].pictureUrl}
                            alt={practice.passages[0].title}
                            className={`w-full h-auto mb-4 rounded-lg shadow-md ${
                              !shouldShowPractice ? "blur-sm" : ""
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
                            <div
                              className={`whitespace-pre-line text-[14px] text-[#212E42] font-medium prose max-w-none prose-p:my-2 prose-headings:my-2 ${
                                !shouldShowPractice ? "blur-sm select-none" : ""
                              }`}
                              dangerouslySetInnerHTML={{
                                __html: formatPracticeHtml(
                                  practice.passages[0].body ?? "",
                                ),
                              }}
                            />
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
                  <div className="p-4 overflow-y-scroll [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                    <div className="flex flex-col gap-4">
                      {practice.passages[0].questions.map((question, index) => (
                        <ReadingQuestionList
                          key={index}
                          questionIndex={index}
                          totalQuestions={practice.totalQuestion}
                          question={question}
                          onAnswerSelect={(
                            questionId: number,
                            answerId: string,
                          ) => {
                            if (shouldShowPractice) {
                              handleAnswerSelect(questionId, answerId);
                            } else {
                              setPremiumPlanModalState();
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
                          <div className="text-[#212E42] mb-6 bg-white p-4 text-[14px] leading-7 font-medium whitespace-pre-line prose max-w-none prose-p:my-2 prose-headings:my-2">
                            {practice.passages[1] &&
                              practice.passages[1].body &&
                              practice.passages[1].body
                                ?.split("${Q}")
                                .map((p, index, arr) => (
                                  <React.Fragment key={index}>
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: formatPracticeHtml(p),
                                      }}
                                    />
                                    {index !== arr.length - 1 && (
                                      <Popover.Root>
                                        <Popover.Trigger className="PopoverTrigger bg-[#F7B267] cursor-pointer px-2 rounded font-semibold text-[#212E42] text-[14px] py-1">
                                          {parseInt(
                                            practice.passages[1].questions[0]
                                              .id,
                                          ) + index}
                                          {selectedAnswers[
                                            practice.passages[0].questions
                                              .length + index
                                          ]
                                            ? ". " +
                                              practice.passages[1].questions[
                                                index
                                              ].choices.find(
                                                (choice) =>
                                                  choice.id ===
                                                  selectedAnswers[
                                                    practice.passages[0]
                                                      .questions.length + index
                                                  ],
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
                                              {practice.passages[1].questions[
                                                index
                                              ].choices.map(
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
                                                            practice.passages[0]
                                                              .questions
                                                              .length + index,
                                                            choice.id,
                                                          );
                                                        } else {
                                                          setPremiumPlanModalState();
                                                        }
                                                      }}
                                                    >
                                                      {selectedAnswers[
                                                        practice.passages[0]
                                                          .questions.length +
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
                                                ),
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
                          </div>
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
                                practice.passages[0].questions?.length +
                                practice.passages[1].questions?.length +
                                index
                              }
                              totalQuestions={practice.totalQuestion}
                              question={question}
                              onAnswerSelect={(
                                questionId: number,
                                answerId: string,
                              ) => {
                                if (shouldShowPractice) {
                                  handleAnswerSelect(
                                    practice.passages[0].questions?.length +
                                      practice.passages[1].questions?.length +
                                      index,
                                    answerId,
                                  );
                                } else {
                                  setPremiumPlanModalState();
                                }
                              }}
                              selectedAnswers={selectedAnswers}
                            />
                          ),
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {page == "answer" && (
              <div className="flex flex-col h-full w-full">
                <ListeningAnswerList
                  questionIndex={questionIndex}
                  questions={practice.passages.reduce(
                    (current: Array<any>, passage: TPassage) => {
                      return current.concat(passage.questions);
                    },
                    [],
                  )}
                  onAnswerSelect={() => {}}
                  selectedAnswers={selectedAnswers}
                />
              </div>
            )}
            {page === "answer" && isLastPractice && (
              <TaskRetakeBanner onRetake={handleRetakeTask} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReadingPracticeView;
