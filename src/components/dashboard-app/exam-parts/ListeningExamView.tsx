"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import AudioPlayer from "../listening-practice/components/AudioPlayer";
import ListeningQuestionList from "../listening-practice/components/ListeningQuestionList";
import { TPracticeDto } from "@/models/practice.model";
import { useRouter } from "nextjs-toploader/app";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import ListeningDropDownQuestionList from "../listening-practice/components/ListeningDropDownQuestionList";
import { useUser } from "@clerk/nextjs";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgChevronDownExam from "@/components/icons/ChevronDownExam";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
import SvgWritingPart from "@/components/icons/WritingPart";
import SvgReadingPart from "@/components/icons/ReadingPart";
import SvgListeningPart from "@/components/icons/ListeningPart";
import AskBeavoButton from "@/components/AskBeavo/AskBeavoButton";
import { ActivityLogger } from "@/lib/userActivity";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";
import { PRACTICE_PARTS } from "@/constants";
import ContinueExamModal from "@/components/modal/ContinueExamModal";

interface ListeningExamViewProps {
  practice: TPracticeDto;
  partId: number;
  examId: string;
  partNumber: string;
  examName?: string;
}

const ListeningExamView = ({
  practice,
  partId,
  examId,
  partNumber,
  examName,
}: ListeningExamViewProps) => {
  const task5or6 = [4, 5, 6];
  const task5or6Time = [180, 240, 270];

  const router = useRouter();
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const { addPoints } = useLeaguePoints();
  const {
    isModalOpen,
    currentTrophy,
    userPoints,
    timeSpent,
    closeTrophy,
    checkTrophyAchievements,
  } = useTrophySystem();

  const [page, setPage] = useState("description");
  const [passageIndex, setPassageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionIndexInPractice, setQuestionIndexInPractice] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [time, setTime] = useState(1620);

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
        if (section === "listening" && partId >= 6) {
          setShowContinueModal(true);
        } else {
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
  //   useEffect(() => {
  //     setQuestionIndexInPractice(0);
  //     setPassageIndex(0);
  //     setQuestionIndex(0);
  //     setSelectedAnswers({});
  //   }, [selectedPracticeId]);

  const handleAnswerSelect = (questionId: number, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId - 1]: answerId,
    }));
  };

  // const handleSubmitAnswers = () => {
  //   // const { score } = handleSubmit();
  //   // onComplete();
  // };
  if (isLoaded && (!user || (user && user.publicMetadata.plan !== "premium"))) {
    router.push("exam-overview");
  }
  //   const practiceIndex = allPractices.findIndex((p) => p.id == selectedPracticeId);

  const [showModal, setShowModal] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);

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
        setShowModal(false);
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
    <>
      <div
        className={`z-[999] fixed inset-0 flex items-center justify-center px-[14px] screen744:!px-[16px] screen1280:!px-[20px] transition-opacity ${showModal
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
          }`}
      >
        <div
          ref={ref}
          className={`max-w-[725px] w-full h-[90vh] screen1280:!h-[828px] p-[24px] bg-white rounded-[16px] transform transition-all duration-300 ease-out overflow-y-auto ${showModal ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
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
        <div className="flex gap-[10px]  screen744:!gap-[40px] items-center mr-[10px]">
          <span className="shrink-0">
            Exam {(examName ?? "").replace(/Mock\s+(Set|Test)/gi, "").trim()}
          </span>
          <div className="flex gap-[10px]">
            <a
              className="relative rounded-[24px] flex-wrap px-[16px] shrink-0   text-[14px] font-normal border-[1px] bg-white flex items-center justify-center border-[#76808F] max-w-[186px] w-full h-[40px]"
              href={`/exams/exam_${examId}/results?partNumber=part${partId}&attemptId=${searchParams.get("attemptId")}`}
            >
              <span className="flex">View Answers &amp; Score</span>
            </a>
            <AskBeavoButton />
          </div>
        </div>
        <div
          onClick={() => setShowModal(true)}
          className="max-w-[442px] justify-between cursor-pointer border px-[16px] border-[#D5D6D8] rounded-[12px] gap-[4px] w-full flex items-center h-[56px]"
        >
          <div className="text-[#37465C] text-[16px]">
            <span className="font-normal">Listening Part{partId}:</span>
            <span className="font-bold">{PRACTICE_PARTS[partId - 1]}</span>
          </div>
          <SvgChevronDownExam className="text-[#37465C]" />
        </div>
      </div>
      <div className=" mx-auto w-full  h-auto transition-all duration-300 flex gap-5">
        <Card className="bg-white/90 flex-col  border border-[#D5D6D8] h-full w-full">
          <div className="flex justify-between rounded-lg lg:items-center gap-2 lg:gap-0 pb-[10px]  px-6 py-4 border-b border-[#D5D6D8] lg:flex-row flex-col w-full  h-auto bg-[#FFEBD6]">
            <div className="flex flex-col-reverse  screen744:!flex-row flex-wrap gap-[16px] max-w-[635px] w-full">
              <div className="text-[14px] flex flex-col font-semibold shrink screen1280:!shrink-0">
                <span>{PRACTICE_PARTS[partId - 1]}</span>
                <span className="font-normal text-[14px] text-[#37465C]">
                  Listening Task {partId}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pb-[10px] ">
              {page === "question" && (
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
                disabled={page == "answer"}
                onClick={() => {
                  const query = section ? `?section=${section}` : "";
                  if (page == "description" && passageIndex == 0) {
                    if (partId === 1) {
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
                  } else if (page == "instructions" && passageIndex == 0) {
                    setPage("description");
                  } else if (page == "problem" && passageIndex == 0) {
                    setPage("instructions");
                  } else if (page == "problem" && passageIndex > 0) {
                    setPage("question");
                    setPassageIndex(passageIndex - 1);
                    setQuestionIndex(
                      (practice.passages[passageIndex - 1]?.questions?.length || 1) - 1
                    );
                    // setQuestionIndexInPractice(questionIndexInPractice - 1);
                  } else if (page == "question" && questionIndex > 0) {
                    setQuestionIndex(questionIndex - 1);
                    setQuestionIndexInPractice(questionIndexInPractice - 1);
                  } else if (page == "question" && questionIndex == 0) {
                    setPage("problem");
                    setQuestionIndex(0);
                    setQuestionIndexInPractice(questionIndexInPractice - 1);
                  }
                  setTime(
                    task5or6.includes(partId)
                      ? task5or6Time[task5or6.indexOf(partId)]
                      : 30
                  );
                }}
                className="cursor-pointer inline-flex items-center justify-center border-[1px] border-[#37465C] rounded-[100%]  w-[40px] h-[40px]"
              >
                <ArrowLeft size={18} strokeWidth={1.7}></ArrowLeft>
              </button>
              <button
                disabled={page == "answer"}
                onClick={() => {
                  if (page == "description") {
                    setPage("instructions");
                    setQuestionIndex(0);
                  } else if (page == "instructions" && passageIndex == 0) {
                    setPage("problem");
                    setQuestionIndex(0);
                  } else if (page == "problem") {
                    setPage("question");
                    setQuestionIndexInPractice(questionIndexInPractice + 1);
                  } else if (
                    page == "question" &&
                    questionIndex <
                    (practice.passages[passageIndex]?.questions?.length || 0) - 1 &&
                    !task5or6.includes(partId)
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
                    // router.push("/exams/exam_" + practice.taskId + "/part" + (partId + 1).toString());
                    setPage("answer");
                  }
                  setTime(
                    task5or6.includes(partId)
                      ? task5or6Time[task5or6.indexOf(partId)]
                      : 30
                  );
                }}
                className={
                  "cursor-pointer flex items-center gap-[8px] justify-center h-[40px] font-normal text-[#212E42] text-[14px] w-[96px] bg-white rounded-[24px]"
                }
              >
                Next
                <SvgArrowRight />
              </button>
            </div>
          </div>
          <div className="flex flex-col w-full h-full">
            {page == "answer" && (
              <div className="p-4 flex flex-col justify-center items-center grow  bg-slate-50 overflow-y-auto [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                <div className="flex flex-col items-center justify-center mx-auto space-y-2 w-full">
                  <div className="text-center text-[14px] font-medium text-gray-800 mb-2 w-full">
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
                <div className="prose max-w-none text-[14px] marker:text-blue-600">
                  <ul>
                    <li>
                      ⁠You’ll listen to a conversation divided into three parts.
                    </li>
                    <li>
                      ⁠After each part, you’ll be asked two or three questions.
                      The questions will be played only once.
                    </li>
                    <li>
                      Select the most appropriate answer for each question.
                    </li>
                  </ul>
                </div>
              </div>
            )}
            {page == "instructions" && (
              <div className="p-6 w-full">
                <p className="text-[14px] text-gray-400 mb-2">Instruction</p>
                <div className="text-slate-900 prose max-w-none text-[14px] font-medium marker:text-blue-600">
                  {practice.instructions?.map(
                    (instruction: string, index: number) => {
                      return (
                        <p key={index} className="mb-0 mt-0">
                          {instruction}
                        </p>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {page == "problem" && (
              <div className="p-[16px] screen1280:!p-[24px] h-full overflow-y-auto w-full">
                <p className="text-[14px] text-slate-900 font-semibold">
                  Listen to the conversation
                </p>
                <div className="flex flex-col gap-2 mt-6 max-w-lg mx-auto">
                  <div className="w-full">
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
                                      className={`${index % 2 == 0
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
              <div className="flex flex-col h-full w-full pb-[50px]">
                {task5or6.includes(partId) ? (
                  practice.passages[passageIndex].questions?.map(
                    (question, index) => (
                      <ListeningDropDownQuestionList
                        key={index}
                        questionIndex={index + 1}
                        totalQuestions={practice.totalQuestion || 0}
                        question={
                          practice.passages[passageIndex]?.questions?.[index] as any
                        }
                        onAnswerSelect={handleAnswerSelect}
                        selectedAnswers={selectedAnswers}
                      />
                    )
                  )
                ) : (
                  <ListeningQuestionList
                    questionIndex={questionIndexInPractice}
                    totalQuestions={practice.totalQuestion || 0}
                    question={
                      practice.passages[passageIndex]?.questions?.[questionIndex] as any
                    }
                    onAnswerSelect={handleAnswerSelect}
                    selectedAnswers={selectedAnswers}
                  />
                )}
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
      {showContinueModal && (
        <ContinueExamModal
          onContinue={() => {
            setShowContinueModal(false);
            router.push(
              `/exams/exam_${practice.taskId}/part7?section=reading&attemptId=${searchParams.get("attemptId")}`
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
