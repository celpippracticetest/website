import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

import { ChevronUp, ChevronDown, X, CircleAlert } from "lucide-react";
import { TPracticeDto } from "@/models/practice.model";
import ListeningSideMenu from "../listening-practice/ListeningSideMenu";
import ListeningAnswerList from "./components/ListeningAnswers";
import { TPassage } from "@/models/listenExam.model";
import { useEffect } from "react";
import useStore from "@/store";

import { cn } from "@/lib/utils";
import { useRouter } from "nextjs-toploader/app";
import { useUser } from "@clerk/nextjs";
import SvgArrowRight from "@/components/icons/ArrowRight";
import { TTaskSchemaDto } from "@/models/tasks.model";
import UpgradeModal from "@/components/modal/UpgradeModal";
import { TWritingAnswerDto } from "@/models/answer";
import LoginModal from "@/components/modal/LoginModal";
import SvgRecording from "@/components/icons/Recording";
import SvgChevronRightForTitle from "@/components/icons/SvgChevronRightForTitle";
import { ActivityLogger } from "@/lib/userActivity";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";

interface SpeakingPracticeViewProps {
  practice: TPracticeDto;
  task: TTaskSchemaDto;
  allPractices: TPracticeDto[];
  selectedPracticeId: string | null;
  selectedTaskId: string | null;
  completedPractice: string[];
  onAnswerButtonClick: (
    practice: TPracticeDto,
    result: Record<string, any>
  ) => void;
  onBackClick: () => void;
  onComplete: () => void;
  onUpgrade: () => void;
  onNextPractice: () => void;
}

const SpeakingPracticeView = ({
  practice,
  task,
  allPractices,
  selectedPracticeId,
  selectedTaskId,
  completedPractice,
  onBackClick,
  onAnswerButtonClick,
}: SpeakingPracticeViewProps) => {
  const preparationTime: { [key: string]: number } = {
    "67f454ba16846d97ecbde9f0": 30,
    "67f454d316846d97ecbde9f1": 30,
    "67f454ef16846d97ecbde9f2": 30,
    "67f4550216846d97ecbde9f3": 30,
    "67f4551416846d97ecbde9f4": 60,
    "67f4552d16846d97ecbde9f5": 60,
    "67f4553d16846d97ecbde9f6": 30,
    "67f4555616846d97ecbde9f7": 30,
  };
  const recordingTimePerTask: { [key: string]: number } = {
    "67f454ba16846d97ecbde9f0": 90,
    "67f454d316846d97ecbde9f1": 60,
    "67f454ef16846d97ecbde9f2": 60,
    "67f4550216846d97ecbde9f3": 60,
    "67f4551416846d97ecbde9f4": 60,
    "67f4552d16846d97ecbde9f5": 60,
    "67f4553d16846d97ecbde9f6": 90,
    "67f4555616846d97ecbde9f7": 60,
  };

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(false);
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
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [page, setPage] = useState("question");
  const [passageIndex, setPassageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionIndexInPractice, setQuestionIndexInPractice] = useState(0);
  const [isOpen, setIsOpen] = useState<Record<number, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [time, setTime] = useState(preparationTime[practice.taskId.toString()]);
  const [recordingTime, setRecordingTime] = useState(
    recordingTimePerTask[practice.taskId.toString()]
  );
  const [wordCount, setWordCount] = useState(0);
  const [progressBar, setProgressBar] = useState(0);
  const [isSubmit, setIsSubmit] = useState(false);
  const [text, setText] = useState("");
  const [tryToSubmit, setTryToSubmit] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const shouldShowPractice: any =
    practice.isFree ||
    (!practice.isFree &&
      user &&
      user.publicMetadata.plan &&
      user.publicMetadata.plan === "premium");
  const [answers, setAnswers] = useState<any[]>([]);
  const [freeAttempts, setFreeAttempts] = useState<number | null>(3);
  const [errorAccessingMicrophone, setErrorAccessingMicrophone] =
    useState(false);
  const setPremiumPlanModalState = useStore(
    (state) => state.setPremiumPlanModalState
  );
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let recordingTimer: NodeJS.Timeout | null = null;
    if (timer) clearInterval(timer);
    if (recordingTimer) clearInterval(recordingTimer);

    if (page === "question" && time > 0) {
      timer = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    }

    if (isRecording && recordingTime > 0) {
      recordingTimer = setInterval(() => {
        setRecordingTime((prevTime) => prevTime - 1);
      }, 1000);
    }

    if (time === 0 && timer) {
      clearInterval(timer);
    }
    if (recordingTime === 0 && recordingTimer) {
      clearInterval(recordingTimer);
      stopRecording();
      setIsSubmit(true);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
    };
  }, [page, time, isRecording, recordingTime]);

  useEffect(() => {
    if (time === 0) {
      if (freeAttempts === 0) {
        if (freeUser) {
          setShowModal(true);
        }
        if (noUser) {
          setShowLoginModal(true);
        }
        return;
      }
      startRecording();
    }
  }, [time]);

  useEffect(() => {
    if (recordingTime === 0) {
      stopRecording();
      setIsSubmit(true);
    }
  }, [recordingTime]);

  useEffect(() => {
    setQuestionIndexInPractice(0);
    setPassageIndex(0);
    setQuestionIndex(0);
    setSelectedAnswers({});
    setText("");
    setProgressBar(0);
    setIsSubmit(false);
    if (isRecording) {
      cancelRecording();
    }
    setTime(preparationTime[practice.taskId.toString()]);
    setRecordingTime(recordingTimePerTask[practice.taskId.toString()]);

    // Log practice started
    if (user && selectedPracticeId) {
      const attemptId = `practice_${selectedPracticeId}_${Date.now()}`;
      ActivityLogger.practiceStarted(attemptId, selectedPracticeId, "Speaking");
    }
  }, [selectedPracticeId, user]);
  useEffect(() => {
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
      const url = new URL("/api/answers/speaking", window.location.origin);
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
  const handleAnswerSelect = (questionId: number, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const startRecording = async () => {
    try {
      if (!user) {
        setPremiumPlanModalState();
        return;
      }
      if (!shouldShowPractice) {
        setPremiumPlanModalState();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        setProgressBar(0);
        setRecordingTime(90);
        const blob = new Blob(audioChunks.current, { type: "audio/m4a" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        const formData = new FormData();
        formData.append("audio", blob, "recording.m4a");
        formData.append("practiceId", selectedPracticeId ?? "");
        const progressInterval = setInterval(() => {
          setProgressBar((prev) => (prev < 100 ? prev + 1 : prev));
        }, 320); // Increment every 300ms to reach 100 in ~30s

        fetch("/api/answers/speaking", {
          method: "POST",
          body: formData,
        })
          .then((response) => {
            clearInterval(progressInterval);
            setProgressBar(100);
            if (!response.ok) {
              throw new Error("Failed to upload audio");
            }
            return response.json();
          })
          .then(async (data) => {
            // Log practice completed
            const attemptId = `practice_${practice.id}_${Date.now()}`;
            await ActivityLogger.practiceCompleted(
              attemptId,
              practice.id,
              "Speaking",
              data.overall,
              data,
              recordingTime
            );

            // Add league points for practice completion (only once)
            if (!pointsAwarded) {
              await addPoints(
                10,
                "practiceSessions",
                `${Math.floor(recordingTime / 60)} minutes`
              );
              setPointsAwarded(true);
            }

            // Log AI feedback generation
            if (data.usage) {
              await ActivityLogger.aiFeedbackGenerated(
                "practice",
                "Speaking",
                data.usage.prompt_tokens || 0,
                data.usage.completion_tokens || 0,
                attemptId
              );

              // Add league points for AI feedback
              await addPoints(5, "aiFeedback");
            }

            // Check for trophy achievements
            await checkTrophyAchievements(
              10,
              "practiceSessions",
              `${Math.floor(recordingTime / 60)}:${recordingTime % 60}`
            );

            setIsSubmit(false);
            onAnswerButtonClick(practice, data);
          })
          .catch((error) => {
            console.error("Error uploading audio:", error);
          })
          .finally(() => {
            setTimeout(() => setProgressBar(0), 1000);
          });
        mediaRecorderRef.current?.stream
          .getTracks()
          .forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setErrorAccessingMicrophone(true);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream
      .getTracks()
      .forEach((track) => track.stop());
    setIsRecording(false);
    mediaRecorderRef.current = null;
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
    audioChunks.current = [];
    setAudioURL(null);
    setIsRecording(false);
  };

  if (!isLoaded || (user && user.publicMetadata?.plan === undefined)) {
    return (
      <div className="text-center py-10 text-gray-500 w-full">Loading...</div>
    );
  }

  return (
    <div className="h-full mx-auto w-full transition-all duration-300 flex gap-5">
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
        <div className="flex justify-between lg:items-center gap-2 lg:gap-0 px-6 py-4 border-b pb-[10px]  border-[#D5D6D8] lg:flex-row flex-col w-full  h-auto bg-[#FFEBD6]">
          <div className="flex gap-2 flex-col screen744:!shrink-0">
            <h1 className="text-[18px] font-bold text-[#212E42]">
              {practice.passages[passageIndex].title}
            </h1>
          </div>
          {
            <div className="flex items-center gap-2 justify-end pb-[10px] ">
              {shouldShowPractice && user && page === "question" && (
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

              <button
                onClick={() => {
                  const practiceIndex = allPractices.findIndex(
                    (p) => p.id == selectedPracticeId
                  );
                  if (practiceIndex < allPractices.length - 1) {
                    if (isRecording) {
                      cancelRecording();
                    }
                    setTime(
                      preparationTime[
                        allPractices[practiceIndex + 1].taskId.toString()
                      ]
                    );
                    setRecordingTime(
                      recordingTimePerTask[
                        allPractices[practiceIndex + 1].taskId.toString()
                      ]
                    );
                    const taskUrl = selectedTaskId
                      ? "&taskId=" + selectedTaskId
                      : "";
                    setPage("question");
                    router.push(
                      "/speaking?selectedPracticeId=" +
                        allPractices[practiceIndex + 1].id +
                        taskUrl
                    );
                  } else {
                  }
                }}
                className={`cursor-pointer gap-[8px] inline-flex items-center justify-center  text-[14px] font-normal w-[96px] h-[40px] rounded-[24px] ${"bg-white"}`}
              >
                {"Next"}

                <SvgArrowRight />
              </button>
            </div>
          }
        </div>
        <div className="flex flex-col h-full overflow-hidden w-full">
          {page == "question" && (
            <div className="h-full overflow-hidden ">
              <div className="grid lg:grid-cols-2 grid-cols-1 h-full w-full">
                <div className="p-4 overflow-y-auto lg:border-r border-r-0 border-b lg:border-b-0 border-slate-300 [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                  <div className="relative">
                    {practice.passages[0].body &&
                    practice.passages[0].body?.length > 30 ? (
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
                    ) : (
                      <p className="text-[14px] text-gray-400 mb-2">
                        Read the following Message, Photo or Diagram
                      </p>
                    )}
                    {practice.passages[0].pictureUrl && (
                      <>
                        <img
                          src={practice.passages[0].pictureUrl}
                          alt={practice.passages[0].title}
                          className={`w-full h-auto mb-4 rounded-lg shadow-md ${
                            !shouldShowPractice ? "blur-sm" : ""
                          }`}
                        />
                      </>
                    )}
                    <p className="text-[14px] text-slate-500">
                      Preparation time:
                      <b className="text-[#F27059] text-[16px]">
                        {preparationTime[practice.taskId]}s
                      </b>
                    </p>
                    <p className="text-[14px] mt-[8px] text-slate-500">
                      Recording time:{" "}
                      <b className="text-[#F27059] text-[16px]">
                        {recordingTimePerTask[practice.taskId]}s
                      </b>
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
                    {practice?.passages?.[0].sampleResponse?.map(
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

                <div className="p-4  overflow-y-auto [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                  <div className="flex flex-col items-center space mb-4">
                    <div className="w-full flex flex-col items-center ">
                      <h3 className="text-[16px] font-bold text-center w-full">
                        {isRecording
                          ? "Recording Time"
                          : time > 0
                          ? "Preparation Time"
                          : ""}
                      </h3>
                    </div>
                    <div
                      className={`${
                        errorAccessingMicrophone ? "mt-0" : "mt-[24px]"
                      } w-full flex flex-col items-center`}
                    >
                      <div className="flex flex-col items-center w-full justify-center">
                        {errorAccessingMicrophone ? (
                          <div
                            role="alert"
                            className="relative h-[204px] border border-[#FF8FA7] rounded-[12px]"
                          >
                            <div className="flex px-[16px] items-center gap-2 h-[44px] bg-[#FFE2E8] rounded-tl-[12px] rounded-tr-[12px]">
                              <CircleAlert
                                width={24}
                                height={24}
                                viewBox="0 0 24 24"
                                className="text-[#EE4266] "
                              />
                              <h5 className=" font-semibold text-[14px]">
                                Can&apos;t Use Microphone!
                              </h5>
                            </div>
                            <div className="text-[14px] p-[16px] text-[#212E42]  font-semibold">
                              We don't have permission to use your microphone.
                              <ol className="mt-[16px] font-normal">
                                <li>
                                  Click &apos;Settings&apos; icon near the
                                  website address.
                                </li>
                                <li>
                                  Find &apos;Microphone&apos; and set it to
                                  Allow.
                                </li>
                                <li>Refresh the page.</li>
                              </ol>
                            </div>
                          </div>
                        ) : isRecording ? (
                          <div className="flex flex-col items-center relative justify-center w-full">
                            <div className="text-[16px] text-[#EE4266] font-semibold text-center  w-full">
                              {recordingTime} s
                            </div>
                            <div className="text-[#212E42] mt-[24px]">
                              Recording...
                            </div>
                            <div className="relative flex flex-col items-center   mt-[24px]">
                              <button
                                className=""
                                onClick={() => {
                                  stopRecording();
                                  setIsSubmit(true);
                                }}
                              >
                                <SvgRecording />
                              </button>
                              <button
                                className="whitespace-nowrap text-[14px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 py-2 w-12 h-12 mt-4 shadow-sm border border-gray-300 rounded-full flex items-center justify-center bg-white hover:bg-gray-300"
                                onClick={() => {
                                  cancelRecording();
                                }}
                              >
                                <X
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-x w-8 h-8 text-gray-600"
                                />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center relative justify-center w-full">
                            <div className="relative w-16 h-16">
                              <svg width="64" height="64" viewBox="0 0 64 64">
                                <g transform="rotate(-90 32 32)">
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="30"
                                    stroke="#D5D6D8"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="30"
                                    stroke="#316BFF"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={2 * Math.PI * 30}
                                    strokeDashoffset={
                                      ((30 - time) / 30) * 2 * Math.PI * 30
                                    }
                                    style={{
                                      transition: "stroke-dashoffset 1s linear",
                                    }}
                                  />
                                </g>
                                <text
                                  x="32"
                                  y="36"
                                  textAnchor="middle"
                                  fill="#316BFF"
                                  fontSize="14"
                                  fontWeight="bold"
                                >
                                  {time}
                                </text>
                              </svg>
                            </div>
                          </div>
                        )}

                        {progressBar !== 0 && (
                          <p className="text-gray-700 font-medium text-center text-[14px] mt-4">
                            {
                              [
                                "Uploading your recording",
                                "Processing your audio…",
                                "Processing your audio…",
                                "Analyzing and assessing…",
                                "Analyzing and assessing…",
                                "Analyzing and assessing…",
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
                          role="progressbar"
                          className="relative overflow-hidden rounded-full bg-slate-200 h-2 w-full mb-4 mt-4"
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
                      </div>
                    </div>
                    {freeAttempts === 0 && (
                      <div className="text-[14px] text-center mt-2 mb-2">
                        <p className="text-[14px] text-gray-600">
                          Your free credits are over. Subscribe to submit your
                          response.
                        </p>
                      </div>
                    )}
                    {freeAttempts === 0 && (
                      <div className="flex flex-col gap-2">
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
                      <div className="flex border-t border-slate-300 mt-4 p-4 flex-col gap-2 w-full">
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
                                  return createdAt.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "2-digit",
                                  });
                                } else {
                                  return createdAt.toLocaleDateString("en-US", {
                                    year: "2-digit",
                                    month: "short",
                                  });
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

export default SpeakingPracticeView;
