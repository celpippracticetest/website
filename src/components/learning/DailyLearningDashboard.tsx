"use client";

import { useCallback, useEffect, useState } from "react";
import SkillLessonCard from "@/components/learning/SkillLessonCard";
import LearningSubscriptionPrompt from "@/components/learning/LearningSubscriptionPrompt";
import LearningContentLoading from "@/components/learning/LearningContentLoading";
import type { ClbScores, SkillLessonPayload } from "@/lib/learning/types";
import { skillToKey } from "@/lib/learning/types";
import { useLeaguePoints } from "@/hooks/useLeaguePoints";

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
  onEditProfile?: () => void;
  currentClb?: ClbScores;
  targetClb?: ClbScores;
};

export default function DailyLearningDashboard({
  dayOffset = 0,
  onEditProfile,
  currentClb: initialCurrentClb,
  targetClb: initialTargetClb,
}: Props) {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingSkill, setCompletingSkill] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addPoints } = useLeaguePoints();

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        dayOffset > 0
          ? `/api/learning/today?d=${dayOffset}`
          : "/api/learning/today";
      const res = await fetch(url);
      const json = (await res.json().catch(() => ({}))) as TodayResponse & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || "Failed to load today's lessons");
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [dayOffset]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  const handleComplete = async (skill: string, assignmentId: string) => {
    setCompletingSkill(skill);
    try {
      const res = await fetch("/api/learning/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, assignmentId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to mark complete");
      }
      void addPoints(5, "aiFeedback");
      await loadToday();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete lesson");
    } finally {
      setCompletingSkill(null);
    }
  };

  if (loading) {
    return (
      <LearningContentLoading
        currentClb={initialCurrentClb}
        targetClb={initialTargetClb}
      />
    );
  }

  if (error && !data?.lessons?.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-error1">{error}</p>
        <button
          type="button"
          onClick={() => void loadToday()}
          className="mt-4 text-sm font-medium text-primary1 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const lessons = data?.lessons ?? [];
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
            {showSubscriptionBanner ? (
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
        {onEditProfile && (
          <button
            type="button"
            onClick={onEditProfile}
            className="text-sm font-medium text-primary1 hover:underline"
          >
            Edit CLB levels
          </button>
        )}
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

      <div className="flex flex-col gap-4">
        {lessons.map((lesson) => (
          <SkillLessonCard
            key={lesson.skill}
            lesson={lesson}
            currentClb={data?.currentClb?.[skillToKey(lesson.skill)]}
            targetClb={data?.targetClb?.[skillToKey(lesson.skill)]}
            onComplete={handleComplete}
            completing={completingSkill === lesson.skill}
          />
        ))}
      </div>
    </div>
  );
}
