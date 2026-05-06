"use client";

import ListeningResultView from "./ListeningResultView";
import ReadingResultView from "./ReadingResultView";
import WritingResultView from "./WritingResultView";
import SpeakingResultView from "./SpeakingResultView";
import { TExamPartSchemaDto } from "@/models/examParts.model";
import { TListeningAndReadingAnswerDto, TWritingAnswerDto } from "@/models/answer";
import { TExamSchemaDto } from "@/models/exam.model";
import { useRouter } from "nextjs-toploader/app";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AskBeavoButton from "@/components/AskBeavo/AskBeavoButton";
import { ActivityLogger } from "@/lib/userActivity";
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import IncompletePartsModal from "@/components/modal/IncompletePartsModal";
import { useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { TQuestion } from "@/models/question.model";
import {
  hasMockExamAccess,
  hasPaidPracticeAccess,
  hasPremiumPlusAccess,
  isMockExamUnlockedViaPurchase,
} from "@/lib/subscriptionAccess";
import {
  MOCK_EXAM_VIEW_MODE_EVENT,
  MOCK_EXAM_VIEW_MODE_STORAGE_KEY,
} from "./components/useExamViewMode";
import { trackCTAClick, trackModal } from "@/lib/gtm";
import { Button } from "@/components/ui/button";

function scaleToBand(weightedPercent: number): number {
  if (isNaN(weightedPercent)) return 0;
  return Math.ceil((weightedPercent / 100) * 12);
}

const ResultExamView = ({
  exams,
  examParts,
  answers: allAnswers,
  speakingAndWritingAnswers: allSpeakingAndWritingAnswers,
  firstReadyExamId,
}: {
  exams: TExamSchemaDto;
  examParts: TExamPartSchemaDto[];
  answers: (TListeningAndReadingAnswerDto & { overalScore?: number })[];
  speakingAndWritingAnswers: TWritingAnswerDto[];
  firstReadyExamId: string | null;
}) => {
  const route = useRouter();
  const searchParams = useSearchParams();
  const currentAttemptId = searchParams.get("attemptId") === "null" ? null : searchParams.get("attemptId");

  const attempts = useMemo(() => {
    const attemptMap = new Map<string, Date>();
    [...allAnswers, ...allSpeakingAndWritingAnswers].forEach((a) => {
      const id = a.attemptId || "legacy";
      const date = a.createdAt ? new Date(a.createdAt) : new Date(0);
      if (!attemptMap.has(id) || date > attemptMap.get(id)!) {
        attemptMap.set(id, date);
      }
    });

    return Array.from(attemptMap.entries())
      .map(([id, date]) => ({ id, date }))
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [allAnswers, allSpeakingAndWritingAnswers]);

  const selectedAttemptId = useMemo(() => {
    if (currentAttemptId && attempts.some((a) => a.id === currentAttemptId)) {
      return currentAttemptId;
    }
    return attempts[0]?.id;
  }, [currentAttemptId, attempts]);

  const answers = useMemo(() => {
    if (!selectedAttemptId) return allAnswers;
    return allAnswers.filter((a) => (a.attemptId || "legacy") === selectedAttemptId);
  }, [allAnswers, selectedAttemptId]);

  const speakingAndWritingAnswers = useMemo(() => {
    if (!selectedAttemptId) return allSpeakingAndWritingAnswers;
    return allSpeakingAndWritingAnswers.filter((a) => (a.attemptId || "legacy") === selectedAttemptId);
  }, [allSpeakingAndWritingAnswers, selectedAttemptId]);

  const { user, isLoaded } = useUser();

  const plan = user?.publicMetadata?.plan as string | undefined;
  const purchaseDate = user?.publicMetadata?.purchaseDate as string | undefined;
  const purchasedMockExamIds = user?.publicMetadata?.purchasedMockExamIds;

  const showPremiumPlusUpsell =
    Boolean(
      isLoaded &&
        user &&
        hasPaidPracticeAccess(plan, purchaseDate) &&
        !hasPremiumPlusAccess(plan, purchaseDate)
    );

  const showSubscriptionUpsell =
    Boolean(
      isLoaded &&
        user &&
        !hasPaidPracticeAccess(plan, purchaseDate) &&
        !hasPremiumPlusAccess(plan, purchaseDate) &&
        isMockExamUnlockedViaPurchase(exams.id, purchasedMockExamIds)
    );

  const postExamUpsellVisible = showPremiumPlusUpsell || showSubscriptionUpsell;

  const upsellSessionKey = useMemo(
    () =>
      `celpip_post_exam_upsell_dismissed:${exams.id}:${selectedAttemptId ?? "legacy"}`,
    [exams.id, selectedAttemptId]
  );

  const [postExamUpsellDismissed, setPostExamUpsellDismissed] = useState(false);
  const [premiumPlusUpgradeBusy, setPremiumPlusUpgradeBusy] = useState(false);
  const [premiumPlusUpgradeError, setPremiumPlusUpgradeError] = useState<string | null>(
    null
  );
  const postExamUpsellViewTrackedRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      setPostExamUpsellDismissed(window.sessionStorage.getItem(upsellSessionKey) === "1");
    } catch {
      setPostExamUpsellDismissed(false);
    }
  }, [upsellSessionKey]);

  useEffect(() => {
    if (!postExamUpsellVisible || postExamUpsellDismissed) {
      return;
    }
    if (postExamUpsellViewTrackedRef.current === upsellSessionKey) {
      return;
    }
    postExamUpsellViewTrackedRef.current = upsellSessionKey;
    const name = showPremiumPlusUpsell
      ? "post_exam_upsell_premium_plus"
      : "post_exam_upsell_subscription";
    trackModal.viewed(name, "mock_exam_results");
  }, [
    postExamUpsellDismissed,
    postExamUpsellVisible,
    showPremiumPlusUpsell,
    upsellSessionKey,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(MOCK_EXAM_VIEW_MODE_STORAGE_KEY, "classic");
    window.dispatchEvent(
      new CustomEvent(MOCK_EXAM_VIEW_MODE_EVENT, { detail: "classic" })
    );
  }, []);

  // Log score report viewed
  useEffect(() => {
    if (user && exams) {
      ActivityLogger.scoreReportViewed(exams.id, "mock");
    }
  }, [user, exams]);

  const dismissPostExamUpsell = () => {
    const name = showPremiumPlusUpsell
      ? "post_exam_upsell_premium_plus"
      : "post_exam_upsell_subscription";
    trackModal.closed(name, "dismissed");
    try {
      window.sessionStorage.setItem(upsellSessionKey, "1");
    } catch {
      /* ignore */
    }
    setPostExamUpsellDismissed(true);
  };

  const runPremiumPlusUpgradeFromResults = async () => {
    if (premiumPlusUpgradeBusy || !showPremiumPlusUpsell) {
      return;
    }
    trackCTAClick("Upgrade to Plus", "post_exam_results");
    setPremiumPlusUpgradeError(null);
    setPremiumPlusUpgradeBusy(true);
    try {
      const res = await fetch("/api/users/upgrade-to-premium-plus", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not upgrade your plan.");
      }
      await user?.reload();
      if (typeof (route as { refresh?: () => void }).refresh === "function") {
        (route as { refresh: () => void }).refresh();
      }
    } catch (e) {
      setPremiumPlusUpgradeError(
        e instanceof Error ? e.message : "Could not upgrade your plan."
      );
    } finally {
      setPremiumPlusUpgradeBusy(false);
    }
  };

  // Detect incomplete sections
  const getIncompleteSections = () => {
    const sections = [];

    // Check Listening (parts 1-6) - if NO answer records exist at all
    const hasListening = answers.some(
      a => a.partId && a.partId >= 1 && a.partId <= 6
    );
    if (!hasListening) sections.push({ name: "Listening", startPart: 1 });

    // Check Reading (parts 7-10) - if NO answer records exist at all
    const hasReading = answers.some(
      a => a.partId && a.partId >= 7 && a.partId <= 10
    );
    if (!hasReading) sections.push({ name: "Reading", startPart: 7 });

    // Check Writing (parts 11-12) - if NO answer records exist at all
    const hasWriting = speakingAndWritingAnswers.some(
      (a) => a.partId && a.partId >= 11 && a.partId <= 12
    );
    if (!hasWriting) sections.push({ name: "Writing", startPart: 11 });

    // Check Speaking (parts 13-20) - if NO answer records exist at all
    const hasSpeaking = speakingAndWritingAnswers.some(
      (a) => a.partId && a.partId >= 13 && a.partId <= 20
    );
    if (!hasSpeaking) sections.push({ name: "Speaking", startPart: 13 });

    return sections;
  };

  const incompleteSections = getIncompleteSections();
  const [showIncompleteModal, setShowIncompleteModal] = useState(incompleteSections.length > 0);

  const listeningAverage = (() => {
    const average = Array.from({ length: 6 })
      .map((_, index) => {
        const userAnswer = answers.find((a) => a.partId == index + 1);
        if (
          !userAnswer ||
          !userAnswer.answers ||
          Object.keys(userAnswer.answers).length === 0
        )
          return 0;
        const examPart = examParts.find((e) => e.partId == index + 1);
        const allQuestions = examPart?.passages?.reduce(
          (questions: TQuestion[], passage) => {
            return questions.concat(passage.questions || []);
          },
          []
        ) || [];
        if (allQuestions.length === 0) return 0;
        const numberOfCorrect = allQuestions.filter(
          (q: TQuestion, index: number) =>
            userAnswer?.answers[index] &&
            q.answer === userAnswer?.answers[index]
        ).length;
        const percentage = (numberOfCorrect / allQuestions.length) * 100;

        return (
          percentage *
          [15 / 100, 15 / 100, 20 / 100, 15 / 100, 15 / 100, 20 / 100][index]
        );
      })
      .reduce((sum, a) => sum + a, 0);

    return scaleToBand(average);
  })();
  const readingAverage = (() => {
    const average = Array.from({ length: 4 })
      .map((_, index) => {
        const userAnswer = answers.find((a) => a.partId == index + 7);
        if (
          !userAnswer ||
          !userAnswer.answers ||
          Object.keys(userAnswer.answers).length === 0
        )
          return 0;
        const examPart = examParts.find((e) => e.partId == index + 7);
        const allQuestions = examPart?.passages?.reduce(
          (questions: TQuestion[], passage) => {
            return questions.concat(passage.questions || []);
          },
          []
        ) || [];
        if (allQuestions.length === 0) return 0;
        const numberOfCorrect = allQuestions.filter(
          (q: TQuestion, index: number) =>
            userAnswer?.answers[index] &&
            q.answer === userAnswer?.answers[index]
        ).length;
        const percentage = (numberOfCorrect / allQuestions.length) * 100;
        return percentage * [20 / 100, 20 / 100, 30 / 100, 30 / 100][index];
      })
      .reduce((sum, a) => sum + a, 0);

    return scaleToBand(average);
  })();

  const writingAverage = (() => {
    const tasks = [
      { partId: 11, weight: 0.5 },
      { partId: 12, weight: 0.5 },
    ];
    const weightedPercent = tasks
      .map(({ partId, weight }) => {
        const ans = speakingAndWritingAnswers.find(
          (a) => a.partId === partId
        );
        return ((ans?.overalScore ?? 0) / 12) * 100 * weight;
      })
      .reduce((sum, p) => sum + p, 0);
    return scaleToBand(weightedPercent);
  })();

  const speakingAverage = (() => {
    const sectionCount = 8;
    const weight = 1 / sectionCount;
    const weightedPercent = Array.from({ length: sectionCount })
      .map((_, i) => {
        const partId = 13 + i;
        const ans = speakingAndWritingAnswers.find(
          (a) => a.partId === partId
        );

        return ((ans?.overalScore ?? 0) / 12) * 100 * weight;
      })
      .reduce((sum, p) => sum + p, 0);
    return scaleToBand(weightedPercent);
  })();

  if (
    isLoaded &&
    (!user ||
      !hasMockExamAccess(
        user.publicMetadata.plan as string | undefined,
        user.publicMetadata.purchaseDate,
        exams.id,
        firstReadyExamId,
        user?.publicMetadata?.purchasedMockExamIds
      ))
  ) {
    route.push("exam-overview");
  }
  return (
    <div className=" mx-auto w-full flex flex-col bg-white  rounded-[8px]">
      <div className=" gap-[10px] text-[#212E42] px-[24px] flex items-center bg-[#FFEBD6] h-auto min-h-[56px] py-2 rounded-tl-[8px] rounded-tr-[8px] text-[18px] font-bold justify-between">
        <div className="flex items-center gap-2">
          Answers & Score
          <div className="hidden screen1280:!flex">
            <AskBeavoButton />
          </div>
        </div>
        {attempts.length > 0 && (
          <div className="flex items-center gap-2 font-normal text-[14px]">
            <span className="hidden screen744:!inline">Attempt History:</span>
            <Select
              value={selectedAttemptId || ""}
              onValueChange={(val) => {
                route.push(`/exams/exam_${exams.id}/results?attemptId=${val}`);
              }}
            >
              <SelectTrigger className="w-[200px] h-[36px] bg-white border-[#D5D6D8]">
                <SelectValue placeholder="Select attempt" />
              </SelectTrigger>
              <SelectContent>
                {attempts.map((att) => (
                  <SelectItem key={att.id} value={att.id}>
                    {format(att.date, "MMM d, yyyy HH:mm")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {postExamUpsellVisible && !postExamUpsellDismissed && (
        <div className="mx-[16px] screen744:!mx-[24px] mt-[16px] rounded-[12px] border border-[#C7D6F8] bg-gradient-to-br from-[#4A7DFF]/12 to-[#0DAA94]/8 px-[16px] py-[14px] screen744:!px-[20px]">
          <div className="flex flex-col gap-[10px] screen744:!flex-row screen744:!items-start screen744:!justify-between">
            <div className="min-w-0 flex-1 space-y-[6px]">
              {showPremiumPlusUpsell ? (
                <>
                  <p className="text-[16px] font-bold text-[#2F3A4C]">
                    Unlock every mock exam
                  </p>
                  <p className="text-[14px] leading-snug text-[#5A6678]">
                    Your Premium plan includes this mock. Upgrade to Premium Plus for the full
                    mock library—same billing period, prorated difference only.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[16px] font-bold text-[#2F3A4C]">
                    Keep the momentum
                  </p>
                  <p className="text-[14px] leading-snug text-[#5A6678]">
                    A subscription unlocks every mock exam and practice features so you can
                    prepare for test day without buying exams one at a time.
                  </p>
                </>
              )}
              {premiumPlusUpgradeError ? (
                <p className="text-[13px] text-red-600" role="alert">
                  {premiumPlusUpgradeError}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-[8px] screen744:!items-end">
              {showPremiumPlusUpsell ? (
                <Button
                  type="button"
                  className="h-10 rounded-full bg-[#4A7DFF] px-5 font-bold text-white hover:bg-[#3A6DEB]"
                  disabled={premiumPlusUpgradeBusy}
                  onClick={() => void runPremiumPlusUpgradeFromResults()}
                >
                  {premiumPlusUpgradeBusy ? "Upgrading…" : "Upgrade to Plus"}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-10 rounded-full bg-[#4A7DFF] px-5 font-bold text-white hover:bg-[#3A6DEB]"
                  onClick={() => {
                    trackCTAClick("View plans", "post_exam_results");
                    route.push("/pricing");
                  }}
                >
                  View plans
                </Button>
              )}
              <button
                type="button"
                className="text-left text-[13px] font-medium text-[#5A6678] underline screen744:!text-right"
                onClick={dismissPostExamUpsell}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-[16px] screen744:!px-[24px] mt-[24px]">
        <Tabs defaultValue="listening" className="w-full pb-[100px] ">
          <TabsList className="screen744:!grid grid-cols-4 flex justify-start shrink-0 overflow-x-auto px-[8px] w-full gap-[0]">
            <TabsTrigger
              className="max-w-[160px]  screen744:!max-w-full shrink-0"
              value="listening"
            >
              Listening
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[160px]  screen744:!max-w-full shrink-0"
              value="reading"
            >
              Reading
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[160px]  screen744:!max-w-full shrink-0"
              value="writing"
            >
              Writing
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[160px]  screen744:!max-w-full shrink-0"
              value="speaking"
            >
              Speaking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listening">
            <div className=" bg-white">
              <div className="flex justify-between bg-white items-center">
                <div className="flex items-center bg-white">
                  Overal Score:{" "}
                  <span
                    className={`opacity-80 font-black text-4xl ${listeningAverage < 4
                      ? "text-red-500"
                      : listeningAverage > 10
                        ? "text-green-500"
                        : "text-[#F59E0B]"
                      }`}
                  >
                    {listeningAverage}
                  </span>
                  <span className="text-gray-400 font-light text">/12</span>
                </div>
              </div>
              <div className="mt-[10px] space-y-[16px]">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ListeningResultView
                    key={index}
                    examPart={examParts.find((e) => e.partId == index + 1)}
                    answer={answers.find((a) => a.partId == index + 1)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reading">
            <div className=" bg-white">
              <div className="flex justify-between bg-white items-center">
                <div className="flex items-center bg-white">
                  Overal Score:{" "}
                  <span
                    className={`opacity-80 font-black text-4xl ${readingAverage < 4
                      ? "text-red-500"
                      : readingAverage > 10
                        ? "text-green-500"
                        : "text-[#F59E0B]"
                      }`}
                  >
                    {readingAverage}
                  </span>
                  <span className="text-gray-400 font-light text">/12</span>
                </div>
              </div>
              <div className="mt-[10px] space-y-[16px]">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ReadingResultView
                    key={7 + index}
                    examPart={examParts.find((e) => e.partId == index + 7)}
                    answer={answers.find((a) => a.partId == index + 7)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="writing">
            <div className=" bg-white">
              <div className="flex justify-between bg-white items-center">
                <div className="flex items-center bg-white">
                  Overal Score:{" "}
                  <span
                    className={`opacity-80 font-black text-4xl ${writingAverage < 4
                      ? "text-red-500"
                      : writingAverage > 10
                        ? "text-green-500"
                        : "text-[#F59E0B]"
                      }`}
                  >
                    {writingAverage}
                  </span>
                  <span className="text-gray-400 font-light text">/12</span>
                </div>
              </div>
              <div className="mt-[10px] space-y-[16px]">
                {Array.from({ length: 2 }).map((_, index) => (
                  <WritingResultView
                    key={11 + index}
                    examPart={examParts.find((e) => e.partId == index + 11)}
                    attemptId={selectedAttemptId}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="speaking">
            <div className=" bg-white">
              <div className="flex justify-between bg-white items-center">
                <div className="flex items-center bg-white">
                  Overal Score:{" "}
                  <span
                    className={`opacity-80 font-black text-4xl ${speakingAverage < 4
                      ? "text-red-500"
                      : speakingAverage > 10
                        ? "text-green-500"
                        : "text-[#F59E0B]"
                      }`}
                  >
                    {speakingAverage}
                  </span>
                  <span className="text-gray-400 font-light text">/12</span>
                </div>
              </div>
              <div className="mt-[10px] space-y-[16px]">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SpeakingResultView
                    key={13 + index}
                    examPart={examParts.find((e) => e.partId == index + 13)}
                    attemptId={selectedAttemptId}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Incomplete Parts Modal */}
      <IncompletePartsModal
        isOpen={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        incompleteParts={incompleteSections}
        examId={exams.id}
      />
    </div>
  );
};

export default ResultExamView;
