"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SkillLessonCard from "@/components/learning/SkillLessonCard";
import LearningSubscriptionPrompt from "@/components/learning/LearningSubscriptionPrompt";
import LearningContentLoading from "@/components/learning/LearningContentLoading";
import LearningProfileSetup from "@/components/learning/LearningProfileSetup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ClbScores,
  LearningSkill,
  SkillLessonPayload,
  SkillLessonState,
} from "@/lib/learning/types";
import { LEARNING_SKILLS, skillLabel, skillToKey } from "@/lib/learning/types";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";
import {
  learningClientLog,
  startLearningClientTimer,
  summarizeClientLessonStates,
} from "@/lib/learning/learningClientLog";
import { cn } from "@/lib/utils";

function skillTabValue(skill: LearningSkill) {
  return skill.toLowerCase();
}

function TabSkillStatus({ state }: { state: SkillLessonState }) {
  if (state === "completed_today") {
    return (
      <span
        className="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success"
        aria-label="Done"
      />
    );
  }
  if (state === "skipped") {
    return (
      <span className="ml-1.5 text-[10px] font-semibold uppercase text-text3">
        Skip
      </span>
    );
  }
  if (state === "subscription_required") {
    return (
      <span className="ml-1.5 text-[10px] font-semibold uppercase text-primary1">
        Pro
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        className="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#F4845F]"
        aria-label="To do"
      />
    );
  }
  if (state === "loading") {
    return (
      <span
        className="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary1"
        aria-label="Loading"
      />
    );
  }
  if (state === "error") {
    return (
      <span
        className="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-error1"
        aria-label="Error"
      />
    );
  }
  return null;
}

type TodayResponse = {
  configured: boolean;
  today?: string;
  hasPendingLessons?: boolean;
  hasSubscription?: boolean;
  requiresSubscription?: boolean;
  currentClb?: ClbScores;
  targetClb?: ClbScores;
  lessons?: SkillLessonPayload[];
};

type Props = {
  dayOffset?: number;
};

export default function DailyLearningDashboard({
  dayOffset = 0,
}: Props) {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [completingSkill, setCompletingSkill] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(skillTabValue("LISTENING"));
  const [error, setError] = useState<string | null>(null);
  const { addPoints } = useLeaguePoints();
  const generatingRef = useRef(false);

  const buildTodayUrl = useCallback(
    (options?: { defer?: boolean; generateOne?: boolean }) => {
      const params = new URLSearchParams();
      if (dayOffset > 0) params.set("d", String(dayOffset));
      if (options?.defer) params.set("defer", "1");
      if (options?.generateOne) params.set("generate", "1");
      const qs = params.toString();
      return qs ? `/api/learning/today?${qs}` : "/api/learning/today";
    },
    [dayOffset]
  );

  const generateRemainingLessons = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    const endChain = startLearningClientTimer("generateRemainingLessons.chain");
    let iteration = 0;

    try {
      let hasLoading = true;
      while (hasLoading) {
        iteration += 1;
        const endIteration = startLearningClientTimer(
          "generateRemainingLessons.iteration",
          { iteration }
        );
        const res = await fetch(buildTodayUrl({ generateOne: true }));
        const json = (await res.json().catch(() => ({}))) as TodayResponse & {
          error?: string;
        };
        if (!res.ok) {
          endIteration({
            ok: false,
            status: res.status,
            error: json.error ?? "request_failed",
          });
          throw new Error(json.error || "Failed to load today's lessons");
        }
        setData(json);
        hasLoading =
          json.lessons?.some((lesson) => lesson.state === "loading") ?? false;
        endIteration({
          ok: true,
          status: res.status,
          hasLoading,
          states: summarizeClientLessonStates(json.lessons),
        });
      }
      endChain({ iteration, done: true });
    } catch (e) {
      endChain({
        iteration,
        done: false,
        error: e instanceof Error ? e.message : "unknown_error",
      });
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      generatingRef.current = false;
    }
  }, [buildTodayUrl]);

  const loadToday = useCallback(
    async (options?: { silent?: boolean; defer?: boolean }) => {
      const silent = options?.silent ?? false;
      const endLoad = startLearningClientTimer("loadToday", {
        silent,
        defer: options?.defer ?? false,
        url: buildTodayUrl({ defer: options?.defer }),
      });
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(buildTodayUrl({ defer: options?.defer }));
        const json = (await res.json().catch(() => ({}))) as TodayResponse & {
          error?: string;
        };
        if (!res.ok) {
          endLoad({
            ok: false,
            status: res.status,
            error: json.error ?? "request_failed",
          });
          throw new Error(json.error || "Failed to load today's lessons");
        }
        setData(json);

        const loadingCount =
          json.lessons?.filter((lesson) => lesson.state === "loading").length ??
          0;
        endLoad({
          ok: true,
          status: res.status,
          configured: json.configured,
          loadingCount,
          states: summarizeClientLessonStates(json.lessons),
        });

        if (loadingCount > 0) {
          learningClientLog("loadToday.queueGeneration", { loadingCount });
          void generateRemainingLessons();
        }
      } catch (e) {
        endLoad({
          ok: false,
          error: e instanceof Error ? e.message : "unknown_error",
        });
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [buildTodayUrl, generateRemainingLessons]
  );

  useEffect(() => {
    void loadToday({ defer: true });
  }, [loadToday]);

  const handleComplete = async (skill: LearningSkill, assignmentId: string) => {
    setCompletingSkill(skill);
    setError(null);
    try {
      const res = await fetch("/api/learning/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, assignmentId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error || "Failed to mark complete");
      }

      setData((prev) => {
        if (!prev?.lessons) return prev;

        const updatedLessons = prev.lessons.map((lesson) =>
          lesson.skill === skill
            ? { ...lesson, state: "completed_today" as const, assignmentId }
            : lesson
        );

        return {
          ...prev,
          lessons: updatedLessons,
          hasPendingLessons: updatedLessons.some(
            (lesson) => lesson.state === "active"
          ),
        };
      });

      void addPoints(5, "aiFeedback");
      void loadToday({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete lesson");
    } finally {
      setCompletingSkill(null);
    }
  };

  const handleProfileComplete = () => {
    setShowSetup(false);
    void loadToday({ defer: true });
  };

  const lessons = data?.lessons ?? [];
  const lessonsBySkill = useMemo(() => {
    const map = new Map<LearningSkill, SkillLessonPayload>();
    for (const lesson of lessons) {
      map.set(lesson.skill, lesson);
    }
    return map;
  }, [lessons]);

  useEffect(() => {
    if (!lessons.length) return;
    const firstActive = lessons.find((lesson) => lesson.state === "active");
    const firstLoading = lessons.find((lesson) => lesson.state === "loading");
    const firstNonSkipped =
      firstActive ??
      firstLoading ??
      lessons.find((lesson) => lesson.state !== "skipped");
    setActiveTab(
      skillTabValue((firstNonSkipped ?? lessons[0]).skill)
    );
  }, [data?.today, lessons]);

  if (loading && !(data?.configured && data.lessons?.length)) {
    return (
      <LearningContentLoading
        currentClb={data?.currentClb}
        targetClb={data?.targetClb}
      />
    );
  }

  if (showSetup || data?.configured === false) {
    return (
      <LearningProfileSetup
        initialCurrent={data?.currentClb}
        initialTarget={data?.targetClb}
        onComplete={handleProfileComplete}
      />
    );
  }

  if (error && !data?.lessons?.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-error1">{error}</p>
        <button
          type="button"
          onClick={() => void loadToday({ defer: true })}
          className="mt-4 text-sm font-medium text-primary1 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const loadingCount = lessons.filter((l) => l.state === "loading").length;
  const pendingCount = lessons.filter((l) => l.state === "active").length;
  const doneCount = lessons.filter((l) => l.state === "completed_today").length;
  const lockedCount = lessons.filter(
    (l) => l.state === "subscription_required"
  ).length;
  const showSubscriptionBanner =
    Boolean(data?.requiresSubscription) && !data?.hasSubscription;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 screen744:flex-row screen744:items-center screen744:justify-between">
        <div>
          <p className="text-sm text-text2">
            {data?.today ? `Today · ${data.today}` : "Today's lessons"}
          </p>
          <p className="text-text1">
            {loadingCount > 0 ? (
              <>
                Preparing{" "}
                <span className="font-semibold text-primary1">{loadingCount}</span>{" "}
                lesson{loadingCount === 1 ? "" : "s"}…
              </>
            ) : showSubscriptionBanner ? (
              <>
                <span className="font-semibold">{doneCount}</span> done today
                {lockedCount > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-primary1">
                      {lockedCount}
                    </span>{" "}
                    locked
                  </>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold">{pendingCount}</span> to complete
                {doneCount > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-success">{doneCount}</span>{" "}
                    done
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSetup(true)}
          className="text-sm font-medium text-primary1 hover:underline"
        >
          Edit CLB levels
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-[#FEF2F2] px-4 py-2 text-sm text-error1">
          {error}
        </p>
      )}

      {showSubscriptionBanner && (
        <div className="mb-6">
          <LearningSubscriptionPrompt />
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="flex w-full shrink-0 justify-start gap-0 overflow-x-auto px-[8px] screen744:!grid screen744:grid-cols-4">
          {LEARNING_SKILLS.map((skill) => {
            const lesson = lessonsBySkill.get(skill);
            return (
              <TabsTrigger
                key={skill}
                value={skillTabValue(skill)}
                disabled={!lesson}
                className={cn(
                  "max-w-[160px] shrink-0 screen744:!max-w-full",
                  !lesson && "opacity-40"
                )}
              >
                <span className="inline-flex items-center">
                  {skillLabel(skill)}
                  {lesson && <TabSkillStatus state={lesson.state} />}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {LEARNING_SKILLS.map((skill) => {
          const lesson = lessonsBySkill.get(skill);
          if (!lesson) return null;

          return (
            <TabsContent key={skill} value={skillTabValue(skill)}>
              <SkillLessonCard
                lesson={lesson}
                currentClb={data?.currentClb?.[skillToKey(skill)]}
                targetClb={data?.targetClb?.[skillToKey(skill)]}
                onComplete={handleComplete}
                completing={completingSkill === skill}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
