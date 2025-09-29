import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
import UpgradeModal from "@/components/modal/UpgradeModal";
import LoginModal from "@/components/modal/LoginModal";
import SvgChevronRight from "@/components/icons/ChevronRight";
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";
import { ActivityLogger } from "@/lib/userActivity";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";

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
  completedPractice,
  isFromFirstPage,
  setIsFromFirstPage,
  onBackClick,
}: ListeningPracticeViewProps) => {
  const task5or6 = ["67ebeffe187829d27daac3c8", "67ebf003187829d27daac3c9"];

  const [showLoginModal, setShowLoginModal] = useState(false);
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
  const [showModal, setShowModal] = useState(false);
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
    task5or6.includes(practice.taskId)
      ? 240 + (task5or6[1] === practice.taskId ? 30 : 0)
      : 30
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
    setQuestionIndexInPractice(0);
    setPassageIndex(0);
    setQuestionIndex(0);
    setSelectedAnswers({});

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
    if (page === "answer" && user && !isFromFirstPage) {
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

            // Add league points
            await addPoints(
              10,
              "practiceSessions",
              `${Math.floor(time / 60)} minutes`
            );

            // Check for trophy achievements
            await checkTrophyAchievements(
              10,
              "practiceSessions",
              `${Math.floor(time / 60)}:${time % 60}`
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
  }, [page, user]);

  useEffect(() => {
    if (page === "answer" && user && isFromFirstPage) {
      const fetchAnswers = async () => {
        try {
          const response = await fetch(
            `/api/answers?practiceId=${practice.id}&userId=${user.id}&type=LISTENING`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch answers");
          }
          const data = await response.json();
          if (data.answers) {
            setSelectedAnswers(data.answers);
          }
        } catch (error) {
          console.error("Error fetching previous answers:", error);
        }
      };
      fetchAnswers();
    }
  }, [page, user, isFromFirstPage, practice.id]);

  const handleAnswerSelect = (questionId: number, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId - 1]: answerId,
    }));
  };

  const practiceIndex = allPractices.findIndex(
    (p) => p.id == selectedPracticeId
  );

  if (!isLoaded || (user && user.publicMetadata?.plan === undefined)) {
    return (
      <div className="text-center py-10 text-gray-500 w-full">Loading...</div>
    );
  }

  return (
    <div className="">
      {freeUser ? (
        showModal && <UpgradeModal setShowModal={setShowModal} />
      ) : noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}
      <div className="pl-[40px] text-[#76808F] text-[14px] mt-[24px] mb-[28px] items-center flex gap-[8px]">
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
        <span className="text-[#212E42]">
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
        <Card className="bg-white/90 flex flex-col overflow-scroll border border-[#D5D6D8] w-full">
          <div className="flex justify-between lg:items-center gap-2 lg:gap-0 px-6 py-4 border-b border-[#D5D6D8] lg:flex-row  w-full  h-auto bg-[#FFEBD6]">
            <div className="flex gap-2 w-full  items-center justify-between">
              <h1 className="text-[18px] font-bold text-[#212E42]">
                {page === "instructions"
                  ? "Instruction"
                  : practice.passages[passageIndex].title}
              </h1>
            </div>

            {page !== "instructions" &&
            !(page == "answer" && practiceIndex >= allPractices.length - 1) ? (
              <div className="flex items-center gap-2 justify-end pb-[10px] ">
                {page === "question" && (
                  <div className="flex justify-center items-center lg:flex-row flex-col">
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
                  onClick={() => {
                    if (page == "problem" && passageIndex == 0) {
                      setPage("instructions");
                    } else if (page == "problem" && passageIndex > 0) {
                      setPage("question");
                      setPassageIndex(passageIndex - 1);
                      setQuestionIndex(
                        practice.passages[passageIndex - 1].questions.length - 1
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
                        practice.passages[passageIndex].questions.length - 1
                      );
                      setPassageIndex(practice.passages.length - 1);
                    }
                    setTime(
                      task5or6.includes(practice.taskId)
                        ? 240 + (task5or6[1] === practice.taskId ? 30 : 0)
                        : 30
                    );
                  }}
                  className="cursor-pointer w-[40px] h-[40px] border flex items-center justify-center border-[#37465C] rounded-[100%]"
                >
                  <ArrowLeft size={18} strokeWidth={1.7}></ArrowLeft>
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
                      questionIndex <
                        practice.passages[passageIndex].questions.length - 1 &&
                      !task5or6.includes(practice.taskId)
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
                      const practiceIndex = allPractices.findIndex(
                        (p) => p.id == selectedPracticeId
                      );
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
                        setPage("finish");
                      }
                    }
                    setTime(
                      task5or6.includes(practice.taskId)
                        ? 240 + (task5or6[1] === practice.taskId ? 30 : 0)
                        : 30
                    );
                  }}
                  className={`cursor-pointer text-[14px] font-normal  inline-flex items-center justify-center rounded-[24px] ${
                    page !== "answer"
                      ? "bg-white"
                      : "bg-green-100 text-gray-900 "
                  } bg-white w-[96px] h-[40px]`}
                >
                  {page !== "answer" ? "Next" : "Next"}
                  <ArrowRight size={18} strokeWidth={1.7}></ArrowRight>
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
                  user &&
                  user.publicMetadata.plan &&
                  user.publicMetadata.plan === "premium") ? (
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
                        className="cursor-pointer rounded-[24px] text-[14px] bg-[#4A7DFF] inline-flex items-center justify-center  font-normal text-white  h-[40px] w-[96px] mt-[32px]"
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
                        setShowModal(true);
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
                        className={`${
                          isOpen ? "!bg-[#F2F6FF] " : " bg-white "
                        } w-full border flex justify-center border-[#76808F] items-center rounded-[24px] borderitems-center cursor-pointer max-w-[153px] h-[40px] text-[14px] font-medium text-[#212E42]`}
                      >
                        {isOpen ? "Hide Transcript" : "Show Transcript"}
                      </button>

                      {isOpen && (
                        <div className="w-full mx-auto mt-[16px] border border-[#D5D6D8] rounded-[12px]">
                          <div className="">
                            <div className="max-w-[450px] flex flex-col gap-[16px] p-[16px]">
                              {practice.passages[
                                passageIndex
                              ].conversation?.map((con, index) => {
                                return (
                                  <div key={index}>
                                    <span
                                      className={`${
                                        index % 2 == 0
                                          ? "bg-[#FFEBD6]"
                                          : "bg-[#D1DEFF]"
                                      }   inline-block leading-[16px] mr-[8px] p-[8px] rounded-[8px]  text-black h-[32px] text-[14px]  font-normal `}
                                    >
                                      {con.name}:
                                    </span>
                                    <span className="text-[14px]  font-normal leading-[20px]">
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
                {task5or6.includes(practice.taskId) ? (
                  practice.passages[passageIndex].questions?.map(
                    (question, index) => (
                      <ListeningDropDownQuestionList
                        key={index}
                        questionIndex={index + 1}
                        totalQuestions={practice.totalQuestion}
                        question={
                          practice.passages[passageIndex].questions[index]
                        }
                        onAnswerSelect={handleAnswerSelect}
                        selectedAnswers={selectedAnswers}
                      />
                    )
                  )
                ) : (
                  <ListeningQuestionList
                    questionIndex={questionIndexInPractice}
                    totalQuestions={practice.totalQuestion}
                    question={
                      practice.passages[passageIndex].questions[questionIndex]
                    }
                    onAnswerSelect={handleAnswerSelect}
                    selectedAnswers={selectedAnswers}
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
