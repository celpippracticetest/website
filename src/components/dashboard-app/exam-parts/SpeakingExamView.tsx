"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

import { ArrowLeft, CircleAlert, LoaderCircle } from "lucide-react";
import { TPracticeDto } from "@/models/practice.model";
import useStore from "@/store";

import { useRouter } from "nextjs-toploader/app";
import { useUser } from "@clerk/nextjs";
import SvgArrowRight from "@/components/icons/ArrowRight";

import UpgradeModal from "@/components/modal/UpgradeModal";
import LoginModal from "@/components/modal/LoginModal";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgRecording from "@/components/icons/Recording";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
import SvgWritingPart from "@/components/icons/WritingPart";
import SvgListeningPart from "@/components/icons/ListeningPart";
import SvgReadingPart from "@/components/icons/ReadingPart";
import SvgChevronDownExam from "@/components/icons/ChevronDownExam";
import AskBeavoButton from "@/components/AskBeavo/AskBeavoButton";
import { ActivityLogger } from "@/lib/userActivity";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import { useTrophySystem } from "@/hooks/useTrophySystem";
import TrophyModal from "@/components/modal/TrophyModal";
import { PRACTICE_PARTS } from "@/constants";

interface SpeakingExamViewProps {
  practice: TPracticeDto;
  partId: number;
  examId?: string;
  examName?: string;
  partNumber?: string;
}

const SpeakingExamView = ({
  practice,
  partId,
  examId,
  examName,
  partNumber,
}: SpeakingExamViewProps) => {
  const router = useRouter();
  const [sendingResult, setSendingResult] = useState(false);
  const [passageIndex, setPassageIndex] = useState(0);

  const [time, setTime] = useState(partId == 17 || partId == 18 ? 60 : 30);
  const [recordingTime, setRecordingTime] = useState(
    partId == 13 || partId == 18 || partId == 19 ? 90 : 60
  );

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
  const [page, setPage] = useState(partId == 13 ? "description" : "question");
  const [progressBar, setProgressBar] = useState(0);
  const [isSubmit, setIsSubmit] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const hasStartedRecordingRef = useRef(false);
  const audioChunks = useRef<Blob[]>([]);
  const shouldShowPractice =
    practice.isFree ||
    (!practice.isFree &&
      user &&
      user.publicMetadata.plan &&
      user.publicMetadata.plan === "premium");

  const [errorAccessingMicrophone, setErrorAccessingMicrophone] =
    useState(false);
  const setPremiumPlanModalState = useStore(
    (state) => state.setPremiumPlanModalState
  );

  if (isLoaded && (!user || (user && user.publicMetadata.plan !== "premium"))) {
    router.push("exam-overview");
  }
  const startRecording = async () => {
    try {
      if (!user) {
        setPremiumPlanModalState();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      // Remove onstop logic; handled in stopRecording.

      mediaRecorderRef.current.start();

      setIsRecording(true);
    } catch (err) {
      setErrorAccessingMicrophone(true);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    // Stop the recorder and wait for onstop event
    await new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    // Stop microphone tracks
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      setMicStream(null);
    }
    setIsRecording(false);

    // Begin upload UI
    setProgressBar(1);
    const blob = new Blob(audioChunks.current, { type: "audio/m4a" });
    const url = URL.createObjectURL(blob);
    setAudioURL(url);

    const formData = new FormData();
    formData.append("audio", blob, "recording.m4a");
    formData.append("examId", practice.taskId);
    formData.append("partId", partId.toString());

    const progressInterval = setInterval(() => {
      setProgressBar((prev) => (prev < 100 ? prev + 1 : prev));
    }, 320);

    try {
      const response = await fetch("/api/exams/answers/speaking", {
        method: "POST",
        body: formData,
      });
      clearInterval(progressInterval);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to upload audio", response, errorText);
        setProgressBar(0);
        return;
      }
      setProgressBar(100);

      // Log mock exam part completed
      const attemptId = `mock_${practice.taskId}_${Date.now()}`;
      await ActivityLogger.mockCompleted(
        attemptId,
        practice.taskId.toString(),
        undefined, // Score will be available later
        undefined, // Breakdown will be available later
        recordingTime
      );

      // Add league points for mock exam completion
      await addPoints(
        20,
        "mockExams",
        `${Math.floor(recordingTime / 60)} minutes`
      );

      // Check for trophy achievements
      await checkTrophyAchievements(
        20,
        "mockExams",
        `${Math.floor(recordingTime / 60)}:${recordingTime % 60}`
      );

      setIsSubmit(true);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error uploading audio:", error);
    }
  };

  const cancelRecording = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      setMicStream(null);
    }
    audioChunks.current = [];
    setAudioURL(null);
    setIsRecording(false);
  };

  // Preparation timer and trigger recording
  useEffect(() => {
    if (time > 0) {
      const prepTimer = setInterval(() => setTime((prev) => prev - 1), 1000);
      return () => clearInterval(prepTimer);
    }
    if (
      time === 0 &&
      page === "question" &&
      !isSubmit &&
      !isRecording &&
      !hasStartedRecordingRef.current
    ) {
      hasStartedRecordingRef.current = true;
      setProgressBar(1);
      setIsRecording(true);
      startRecording();
    }
  }, [time, page, isSubmit, isRecording]);

  // Recording timer and auto-stop
  useEffect(() => {
    if (isRecording && recordingTime > 0) {
      const recTimer = setInterval(
        () => setRecordingTime((prev) => prev - 1),
        1000
      );
      return () => clearInterval(recTimer);
    }
    if (recordingTime === 0 && isRecording) {
      stopRecording();
      setIsSubmit(true);
    }
  }, [recordingTime, isRecording]);

  // Reset state when practice or part changes
  useEffect(() => {
    setPassageIndex(0);
    setIsSubmit(false);
    setProgressBar(0);
    setAudioURL(null);
    setPage(partId === 13 ? "description" : "question");
    if (isRecording) {
      cancelRecording();
    }
    setTime(partId === 17 || partId === 18 ? 60 : 30);
    setRecordingTime(partId === 13 || partId === 18 || partId === 19 ? 90 : 60);
    hasStartedRecordingRef.current = false;

    // Log mock exam started when component mounts
    if (user && practice.taskId) {
      const attemptId = `mock_${practice.taskId}_${Date.now()}`;
      ActivityLogger.mockStarted(attemptId, practice.taskId.toString());
    }
  }, [practice.taskId, partId, user]);

  const [menuShowModal, setMenuShowModal] = useState(false);
  interface PracticeSection {
    title: string;
    color: string;
    icon: React.ReactNode;
    route: string;
    bgColor: string;
  }
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
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
    <div className="h-full mx-auto w-full  transition-all duration-300 flex gap-5">
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
            className={`z-[999] fixed inset-0 flex items-center justify-center px-[14px] screen744:!px-[16px] screen1280:!px-[20px] transition-opacity ${
              menuShowModal
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div
              ref={ref}
              className={`max-w-[725px] w-full h-[90vh] screen1280:!h-[828px] p-[24px] bg-white rounded-[16px] transform transition-all duration-300 ease-out overflow-y-auto ${
                menuShowModal
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
                            className={`${
                              partId === p.index ? "bg-[#F7F9FF]" : "bg-white"
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
                  href={`/exams/exam_${examId}/results?partNumber=part${partNumber}`}
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
              <span className="font-normal">Speaking Part{partId}:</span>
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
                  Speaking Task {partId - 12}
                </span>
              </div>
            </div>
            {
              <div className="flex items-center gap-2 justify-end pb-[10px] ">
                <button
                  onClick={() => {
                    if (isRecording) cancelRecording();
                    if (page == "description" && passageIndex == 0) {
                      if (partId === 1) {
                        router.push("/exam-overview");
                      } else {
                        router.push(
                          "/exams/exam_" +
                            practice.taskId +
                            "/part" +
                            (partId - 1).toString()
                        );
                      }
                    } else if (page == "question" && partId === 7) {
                      setPage("description");
                    } else if (page == "question") {
                      router.push(
                        "/exams/exam_" +
                          practice.taskId +
                          "/part" +
                          (partId - 1).toString()
                      );
                    } else if (page == "evaluateResult") {
                      setPage("question");
                    }
                    setTime(partId == 17 || partId == 18 ? 60 : 30);
                  }}
                  className="cursor-pointer inline-flex items-center justify-center border-[1px] border-[#37465C] rounded-[100%]  w-[40px] h-[40px]"
                >
                  <ArrowLeft size={18} strokeWidth={1.7}></ArrowLeft>
                </button>
                <button
                  onClick={() => {
                    if (isRecording) cancelRecording();
                    if (page == "description") {
                      setPage("question");
                      setTime(partId == 17 || partId == 18 ? 60 : 30);
                    } else if (page == "question") {
                      if (partId == 20) {
                        setPage("evaluateResult");
                        setTime(10);
                      } else {
                        router.push(
                          "/exams/exam_" +
                            practice.taskId +
                            "/part" +
                            (partId + 1).toString()
                        );
                        setTime(partId == 17 || partId == 18 ? 60 : 30);
                      }
                    } else if (page == "evaluateResult") {
                      router.push(
                        "/exams/exam_" + practice.taskId + "/results"
                      );
                      setTime(partId == 17 || partId == 18 ? 60 : 30);
                    }
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
            {page == "evaluateResult" && !sendingResult && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <p className="text-[16px] font-bold text-[#212E42] mb-4">
                  Evaluation Complete!
                </p>
                <a href={"/exams/exam_" + practice.taskId + "/results"}>
                  <button className="bg-[#4A7DFF] text-white flex items-center rounded-[24px] px-[24px] h-[40px] cursor-pointer ">
                    View Results
                  </button>
                </a>
              </div>
            )}
            {page == "evaluateResult" && sendingResult && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="mb-8">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-2xl font-bold text-gray-800 mb-2">
                    Evaluating your answers...
                  </p>
                  <p className="text-gray-600">Please wait {time} seconds</p>
                </div>
                <p className="text-[14px] text-gray-500 max-w-md">
                  We are calculating your score and analyzing your performance
                  across all sections.
                </p>
              </div>
            )}
            {page == "description" && (
              <div className="p-6">
                <p className="text-lg font-bold text-gray-800 mb-2">
                  What is this part?
                </p>
                <div className="prose max-w-none text-[14px] marker:text-blue-600">
                  <ul>
                    <li>you will have 8 tasks of speaking.</li>
                  </ul>
                </div>
              </div>
            )}
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
                      <p className=" text-[14px] text-slate-500">
                        Preparation time:{" "}
                        <b className="text-[#F27059] text-[16px]">
                          {partId == 17 || partId == 18 ? 60 : 30}s
                        </b>
                      </p>
                      <p className="text-[14px] mt-[8px] text-slate-500">
                        Recording time:{" "}
                        <b className="text-[#F27059] text-[16px]">
                          {partId == 13 || partId == 18 || partId == 19
                            ? 90
                            : 60}
                          s
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
                  </div>

                  <div className="p-4 overflow-y-auto flex flex-col justify-center items-center grow  bg-slate-50  [&::-webkit-scrollbar]:w-2  [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
                    <div className="flex flex-col items-center space">
                      <div className="w-full flex flex-col items-center "></div>
                      <div className="w-full flex flex-col items-center">
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
                            <div className="flex flex-col items-center relative justify-center w-full gap-4">
                              <p className="text-center font-medium text-[14px]">
                                Recording...
                                <br />
                                <span className="font-bold text-3xl">
                                  {recordingTime}s
                                </span>
                              </p>
                              <div className="relative w-16 h-16">
                                <div className="absolute top-0 left-0 right-0 bottom-0 rounded-full animate-ping opacity-75 pointer-events-none"></div>
                                <div className="absolute top-0 left-0 right-0 bottom-0 rounded-full pointer-events-none"></div>
                                <button
                                  className="cursor-pointer"
                                  onClick={() => {
                                    stopRecording();
                                  }}
                                >
                                  <SvgRecording />
                                </button>
                              </div>
                            </div>
                          ) : time > 0 && !isSubmit && progressBar == 0 ? (
                            <div className="flex flex-col items-center gap-4">
                              <span className="text-[#212E42] text-[16px] font-bold">
                                Preparation Time
                              </span>
                              <div className="mt-[24px]">
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
                                        transition:
                                          "stroke-dashoffset 1s linear",
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
                          ) : isSubmit && progressBar == 100 ? (
                            <div className="flex flex-col items-center gap-4">
                              <div className="flex flex-col items-center gap-2">
                                <SvgCheckCircle />
                                <span className="text-green-700 font-bold text-xl">
                                  Your recording submitted!
                                </span>
                                <p className="text-gray-600">
                                  You can now proceed to the next step.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center mx-auto space-y-2 w-full">
                              <div className="text-center text-[14px] font-medium text-gray-800 mb-2 w-full">
                                Upload recording...
                              </div>
                              <LoaderCircle className="w-8 h-8 text-gray-800 animate-spin"></LoaderCircle>
                            </div>
                          )}
                        </div>
                      </div>
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
    </div>
  );
};

export default SpeakingExamView;
