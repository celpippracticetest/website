import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import AudioPlayer from "./components/AudioPlayer";
import ListeningQuestionList from "./components/ListeningQuestionList";
import { TPracticeDto } from "@/models/practice.model";
import ListeningSideMenu from "./ListeningSideMenu";
import ListeningAnswerList from "./components/ListeningAnswers";
import { TPassage } from "@/models/listenExam.model";
import { useRouter } from "nextjs-toploader/app";
import { useEffect } from "react";
import ListeningDropDownQuestionList from "./components/ListeningDropDownQuestionList";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { useUser } from "@clerk/nextjs";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import SvgArrowRight from "@/components/icons/ArrowRight";
import LoginModal from "@/components/modal/LoginModal";
import SvgChevronRight from "@/components/icons/ChevronRight";
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";
import { ActivityLogger } from "@/lib/userActivity";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";
import StatBadge from "@/components/shared/StatBadge";
import { usePracticeCount } from "@/hooks/usePracticeCount";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

interface ListeningPracticeViewProps {
  practice: TPracticeDto;
  task: TTaskSchemaDto;
  allPractices: TPracticeDto[];
  selectedPracticeId: string | null;
  selectedTaskId: string | null;
  previousAnswer: TListeningAndReadingAnswerDto | null;
  completedPractice: string[];
  onBackClick: () => void;
  onComplete: () => void;
  onUpgrade: () => void;
  onNextPractice: () => void;
  isFromFirstPage: boolean;
  setIsFromFirstPage: React.Dispatch<React.SetStateAction<boolean>>;
}

const ListeningPracticeView = ({
  practice,
  task,
  allPractices,
  selectedPracticeId,
  selectedTaskId,
  previousAnswer,
  completedPractice,
  isFromFirstPage,
  setIsFromFirstPage,
  onBackClick,
}: ListeningPracticeViewProps) => {
  const practiceCount = usePracticeCount(task.id, practice.id, task.taskNumber);
  const task5or6 = ["67ebeffe187829d27daac3c8", "67ebf003187829d27daac3c9"];
  const taskNum = parseInt(task.taskNumber.replace(/\D/g, "") || "0", 10);
  const useDropdownForQuestions = taskNum > 3;
  const initialTime = task5or6.includes(practice.taskId)
    ? 240 + (task5or6[1] === practice.taskId ? 30 : 0)
    : 30;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const { user, isSignedIn, isLoaded } = useUser();
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
  const router = useRouter();
  const [isPlaying] = useState(false);
  const [page, setPage] = useState("instructions");
  const [passageIndex, setPassageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionIndexInPractice, setQuestionIndexInPractice] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [time, setTime] = useState(
    initialTime
  );

  // Safe helpers to avoid optional-undefined issues
  const totalQuestionsCount =
    practice.totalQuestion !== undefined
      ? practice.totalQuestion
      : practice.passages.reduce((sum: number, p: TPassage) => {
        return sum + (p.questions?.length ?? 0);
      }, 0);

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

    const fetchPreviousAnswers = async () => {
      if (!user || !selectedPracticeId) return;
      try {
        const response = await fetch(
          `/api/answers?practiceId=${selectedPracticeId}&userId=${user.id}&type=LISTENING`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.answers) {
            setSelectedAnswers(data.answers);
            setPage("answer");
            return;
          }
        }
        setSelectedAnswers({});
        setPage("instructions");
      } catch (error) {
        console.error("Error fetching previous answers:", error);
        setSelectedAnswers({});
        setPage("instructions");
      }
    };

    fetchPreviousAnswers();

    // Log practice started
    if (user && selectedPracticeId) {
      const attemptId = `practice_${selectedPracticeId}_${Date.now()}`;
      ActivityLogger.practiceStarted(
        attemptId,
        selectedPracticeId,
        "Listening"
      );
    }
  }, [selectedPracticeId, user]);

  useEffect(() => {
    if (page === "answer" && user) {
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
            const result = await response.json();
            // Log practice completed
            const attemptId = `practice_${practice.id}_${Date.now()}`;
            await ActivityLogger.practiceCompleted(
              attemptId,
              practice.id,
              "Listening",
              result.overall,
              result,
              time
            );

            // Add league points (only once) and confirm success
            if (!pointsAwarded) {
              const res = await addPoints(
                10,
                "practiceSessions",
                `${Math.floor(time / 60)} minutes`
              );
              if (res && (res as any).success) {
                setPointsAwarded(true);
                // Check for trophy achievements only after success
                await checkTrophyAchievements(
                  10,
                  "practiceSessions",
                  `${Math.floor(time / 60)}:${time % 60}`
                );
              } else {
                console.warn("addPoints failed; skipping trophy check and award flag");
              }
            }
          }
        } catch (error) {
          // Optionally handle error
          console.error("Failed to submit answers:", error);
        }
      };

      // Only submit if we are NOT in viewed mode (i.e., user just finished)
      // We can check if selectedAnswers is not empty as a heuristic, 
      // but it's better to have a flag. For now, just ensuring it's not a fresh navigation.
      if (Object.keys(selectedAnswers).length > 0) {
        submitAnswers();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user]);



  const handleAnswerSelect = (questionId: number, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId - 1]: answerId,
    }));
  };

  const practiceIndex = allPractices.findIndex(
    (p) => p.id == selectedPracticeId
  );

  const resetToStart = () => {
    setSelectedAnswers({});
    setPage("problem");
    setPassageIndex(0);
    setQuestionIndex(0);
    setQuestionIndexInPractice(0);
    setTime(initialTime);
    setIsOpen(false);
  };

  if (!isLoaded || (user && user.publicMetadata?.plan === undefined)) {
    return (
      <div className="text-center py-10 text-gray-500 w-full">Loading...</div>
    );
  }

  return (
    <div className="">
      {noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}
      <div className="w-full min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 pl-0 screen744:pl-[40px] text-[#76808F] text-[14px] mt-[-35px] mb-[28px]">
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
            router.push("/listening");
          }}
        >
          Listening
        </div>
        <SvgChevronRightForTitle />
        <span className="min-w-0 max-w-full break-words text-[#212E42]">
          <span className="text-[#76808F]">
            {task.taskNumber?.replace(" #", "")}
          </span>
          .{task.name}
        </span>
      </div>
      <div className=" mx-auto w-full flex-col screen1280:!flex-row   transition-all duration-300 flex gap-[20px]">
        <ListeningSideMenu
          allPractices={allPractices}
          practice={practice}
          task={task}
          isCompleted={false}
          isPlaying={isPlaying}
          onBackClick={onBackClick}
          selectedPracticeId={selectedPracticeId}
          selectedTaskId={selectedTaskId}
          completedPractice={completedPractice}
        />
        <Card className="bg-white/90 flex flex-col overflow-auto border border-[#D5D6D8] w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 px-6 py-4 border-b border-[#D5D6D8] w-full min-w-0 h-auto bg-[#FFEBD6]">
            <div className="flex w-full min-w-0 flex-col items-start gap-2 lg:flex-1 lg:w-auto lg:min-w-0">
              <h1 className="text-[18px] font-bold text-[#212E42] break-words">
                {page === "instructions"
                  ? "Instruction"
                  : practice.passages[passageIndex].title}
              </h1>
              <StatBadge
                count={practiceCount}
                label="answered today"
              />
            </div>

            {page !== "instructions" ? (
              <div className="flex w-full min-w-0 shrink-0 flex-row flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-[10px] lg:w-auto lg:min-w-fit lg:flex-none lg:gap-2 lg:overflow-visible lg:pb-0">
                  {page === "question" && (
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
                    hidden={page === "problem" && passageIndex === 0}
                    onClick={() => {
                    if (page == "problem" && passageIndex == 0) {
                      setPage("instructions");
                    } else if (page == "problem" && passageIndex > 0) {
                      setPage("question");
                      setPassageIndex(passageIndex - 1);
                      setQuestionIndex(
                        Math.max(
                          0,
                          (practice.passages[passageIndex - 1].questions?.length ?? 1) -
                          1
                        )
                      );
                      // setQuestionIndexInPractice(questionIndexInPractice - 1);
                    } else if (page == "question" && questionIndex > 0) {
                      setQuestionIndex(questionIndex - 1);
                      setQuestionIndexInPractice(questionIndexInPractice - 1);
                    } else if (page == "question" && questionIndex == 0) {
                      setPage("problem");
                      setQuestionIndex(0);
                      setQuestionIndexInPractice(questionIndexInPractice - 1);
                    } else if (page == "answer") {
                      setPage("question");
                      setQuestionIndex(
                        Math.max(
                          0,
                          (practice.passages[passageIndex].questions?.length ?? 1) -
                          1
                        )
                      );
                      setPassageIndex(practice.passages.length - 1);
                    }
                    setTime(
                      task5or6.includes(practice.taskId)
                        ? 240 + (task5or6[1] === practice.taskId ? 30 : 0)
                        : 30
                    );
                  }}
                    className="cursor-pointer shrink-0 w-[40px] h-[40px] border flex items-center justify-center border-[#37465C] rounded-[100%]"
                  >
                    <ArrowBack sx={{ fontSize: 18 }} />
                  </button>
                <button
                  onClick={() => {
                    if (page == "instructions" && passageIndex == 0) {
                      setPage("problem");
                      setQuestionIndex(0);
                    } else if (page == "problem") {
                      setPage("question");
                      setQuestionIndexInPractice(questionIndexInPractice + 1);
                    } else if (
                      page == "question" &&
                      useDropdownForQuestions
                    ) {
                      setPage("answer");
                    } else if (
                      page == "question" &&
                      questionIndex <
                      (practice.passages[passageIndex].questions?.length ?? 0) - 1 &&
                      !useDropdownForQuestions
                    ) {
                      setQuestionIndex(questionIndex + 1);
                      setQuestionIndexInPractice(questionIndexInPractice + 1);
                    } else if (
                      page == "question" &&
                      passageIndex < practice.passages.length - 1
                    ) {
                      setPage("problem");
                      setPassageIndex(passageIndex + 1);

                      setQuestionIndex(0);
                    } else if (page == "question") {
                      setPage("answer");
                    } else if (page === "answer") {
                      if (practiceIndex < allPractices.length - 1) {
                        const taskUrl = selectedTaskId
                          ? "&taskId=" + selectedTaskId
                          : "";
                        setPage("instructions");
                        setQuestionIndex(0);
                        setPassageIndex(0);
                        router.push(
                          "/listening?selectedPracticeId=" +
                          allPractices[practiceIndex + 1].id +
                          taskUrl
                        );
                      } else {
                        resetToStart();
                      }
                    }
                    setTime(initialTime);
                  }}
                  className={`cursor-pointer shrink-0 text-[14px] font-medium inline-flex items-center justify-center gap-1 rounded-[24px] w-[96px] min-h-[40px] px-2 sm:px-3 ${page !== "answer"
                    ? "bg-[#4A7DFF] text-white lg:bg-white lg:text-[#212E42] lg:font-normal"
                    : "bg-green-100 text-gray-900"
                    }`}
                >
                  {page === "answer" && practiceIndex >= allPractices.length - 1
                    ? "Start again"
                    : "Next"}
                  <ArrowForward sx={{ fontSize: 18 }} />
                </button>
              </div>
            ) : (
              <></>
            )}
          </div>
          <div className="flex flex-col  w-full">
            {page == "instructions" ? (
              <div className="px-[24px] py-[16px] w-full">
                <div className="text-[#212E42]  font-normal prose max-w-none text-[14px]  marker:text-blue-600">
                  {practice?.instructions?.map(
                    (instruction: string, index: number) => {
                      return (
                        <p key={index} className="mb-0 mt-0">
                          {instruction}
                        </p>
                      );
                    }
                  )}
                </div>
                {practice.isFree ||
                  (!practice.isFree &&
                    hasPaidPracticeAccess(
                      user?.publicMetadata.plan as string | undefined,
                      user?.publicMetadata.purchaseDate as string | undefined
                    )) ? (
                  <div>
                    {completedPractice.includes(practice.id) ? (
                      <div className="flex flex-col gap-[16px] mt-[23px]">
                        <span className="flex justify-center items-center max-w-[342px] bg-[#F2F6FF] px-[16px] h-auto min-h-[44px] leading-[28px] rounded-[8px] text-[#5786FF] text-[16px] font-medium">
                          You’ve already completed this exercise
                        </span>

                        <div className="flex gap-[10px]">
                          <Button
                            onClick={() => {
                              setPage("problem");
                            }}
                            variant="outline"
                            className="cursor-pointer max-w-[119px] rounded-[24px] text-[14px] bg-[#4A7DFF]  items-center justify-center  font-normal text-white  h-[40px]  mt-[32px]"
                            aria-label="Next testimonial"
                          >
                            Start again
                          </Button>
                          <Button
                            onClick={() => {
                              setPage("answer");
                              setIsFromFirstPage(true);
                            }}
                            variant="outline"
                            className="cursor-pointer text-[#76808F]  max-w-[115px] rounded-[24px] text-[14px]  items-center justify-center  font-normal  h-[40px]  mt-[32px]"
                            aria-label="Next testimonial"
                          >
                            See Result
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setPage("problem");
                        }}
                        variant="outline"
                        className="cursor-pointer rounded-[24px] text-[14px] bg-[#4A7DFF] inline-flex items-center justify-center font-normal text-white h-[40px] w-full max-w-full screen744:w-[96px] mt-[32px]"
                        aria-label="Next testimonial"
                      >
                        Next
                        <SvgArrowRight />
                      </Button>
                    )}
                  </div>
                ) : (
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
                )}
              </div>
            ) : (
              <></>
            )}

            {page == "problem" && (
              <div className="p-2 h-full  w-full">
                <p className="text-[18px] text-[#212E42] font-semibold flex justify-center">
                  Listen to the conversation
                </p>
                <div className="flex flex-col mt-[24px] max-w-[450px] mx-auto">
                  <div className="w-full ">
                    <AudioPlayer
                      audioUrl={practice.passages[passageIndex].audioUrl}
                    />
                    <div className="flex items-center flex-col mt-6 max-w-[450px] mx-auto">
                      <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`${isOpen ? "!bg-[#F2F6FF] " : " bg-white "
                          } w-full border flex justify-center border-[#76808F] items-center rounded-[24px] borderitems-center cursor-pointer max-w-[153px] h-[40px] text-[14px] font-medium text-[#212E42]`}
                      >
                        {isOpen ? "Hide Transcript" : "Show Transcript"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPage("question");
                          setQuestionIndexInPractice(questionIndexInPractice + 1);
                          setTime(initialTime);
                        }}
                        className="cursor-pointer text-[14px] font-medium inline-flex items-center justify-center gap-1 rounded-[24px] w-full max-w-[153px] h-[40px] px-4 bg-[#4A7DFF] text-white mt-4"
                        aria-label="Go to questions"
                      >
                        Next
                        <ArrowForward sx={{ fontSize: 18 }} />
                      </button>

                      {isOpen && (
                        <div className="w-full mx-auto mt-[16px] border-0 sm:border sm:border-[#D5D6D8] rounded-none sm:rounded-[12px]">
                          <div className="">
                            <div className="max-w-[450px] flex flex-col gap-[16px] p-0 sm:p-[16px]">
                              {practice.passages[
                                passageIndex
                              ].conversation?.map((con, index) => {
                                return (
                                  <div key={index}>
                                    <span
                                      className={`${index % 2 == 0
                                        ? "bg-[#FFEBD6]"
                                        : "bg-[#D1DEFF]"
                                        } inline-block align-top leading-tight mr-[6px] sm:mr-[8px] p-[6px] sm:p-[8px] rounded-[6px] sm:rounded-[8px] text-black min-h-[26px] h-auto sm:h-[32px] sm:leading-[16px] text-[12px] sm:text-[14px] font-normal`}
                                    >
                                      {con.name}:
                                    </span>
                                    <span className="text-[12px] font-normal leading-[18px] sm:text-[14px] sm:leading-[20px]">
                                      {" "}
                                      {con.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {page == "question" && (
              <div className="flex flex-col h-full w-full ">
                {useDropdownForQuestions ? (
                  (
                    practice.passages.reduce(
                      (acc: any[], p: TPassage) => {
                        return acc.concat(p.questions ?? []);
                      },
                      []
                    )
                  ).map((question, index) => (
                    <ListeningDropDownQuestionList
                      key={index}
                      questionIndex={index + 1}
                      totalQuestions={practice.totalQuestion ?? totalQuestionsCount}
                      question={question}
                      onAnswerSelect={handleAnswerSelect}
                      selectedAnswers={selectedAnswers}
                    />
                  ))
                ) : (
                  <ListeningQuestionList
                    questionIndex={questionIndexInPractice}
                    totalQuestions={practice.totalQuestion ?? totalQuestionsCount}
                    question={
                      (practice.passages[passageIndex].questions ?? [])[questionIndex]
                    }
                    onAnswerSelect={handleAnswerSelect}
                    selectedAnswers={selectedAnswers}
                    onNext={() => {
                      if (
                        questionIndex <
                        (practice.passages[passageIndex].questions?.length ?? 0) - 1
                      ) {
                        setQuestionIndex(questionIndex + 1);
                        setQuestionIndexInPractice(questionIndexInPractice + 1);
                      } else if (passageIndex < practice.passages.length - 1) {
                        setPage("problem");
                        setPassageIndex(passageIndex + 1);
                        setQuestionIndex(0);
                      } else {
                        setPage("answer");
                      }

                      setTime(initialTime);
                    }}
                  />
                )}
              </div>
            )}
            {page == "answer" && (
              <div className="flex flex-col h-full w-full pb-[50px]">
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

          {/* {practice.passages.map((passage, index) => {
              return (
                <>
                  <AudioPlayer audioUrl={practice.audioUrl} maxPlays={2} />
                  <ListeningQuestionList
                    questions={passage.questions}
                    showResults={showResults}
                    onAnswerSelect={handleAnswerSelect}
                    selectedAnswers={selectedAnswers}
                  />
                </>
              );
            })}  */}

          {/* {showResults ? (
            <ResultsDisplay 
              score={score}
              correctAnswers={getCorrectAnswersCount()}
              totalQuestions={practice.questions.length}
              onBackClick={onBackClick}
              onNextPractice={onNextPractice}
            />
          ) : (
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
              onClick={handleSubmitAnswers}
              disabled={!allQuestionsAnswered}
            >
              Submit Answers
            </Button>
          )} */}
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
    </div>
  );
};

export default ListeningPracticeView;
