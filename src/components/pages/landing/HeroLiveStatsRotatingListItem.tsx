"use client";

import BorderColor from "@mui/icons-material/BorderColor";
import Headphones from "@mui/icons-material/Headphones";
import Insights from "@mui/icons-material/Insights";
import MenuBook from "@mui/icons-material/MenuBook";
import Mic from "@mui/icons-material/Mic";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/** 100 distinct faces via pravatar `u` seed (stable per index). */
const AVATAR_POOL: readonly string[] = Array.from(
  { length: 100 },
  (_, i) => `https://i.pravatar.cc/128?u=${i + 1}`,
);

/** Seeded PRNG for deterministic shuffle (stable across re-renders for same seed). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

/** Pick 5 unique random avatars from the pool for this rotation. */
function pickFiveAvatars(seed: number): { alt: string; src: string }[] {
  const rand = mulberry32(seed);
  const indices = Array.from({ length: 100 }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, 5).map((idx) => ({
    alt: "Learner",
    src: AVATAR_POOL[idx],
  }));
}

interface LiveStatsResponse {
  success: boolean;
  stats: {
    onlineUsers: number;
    skillBreakdown?: Record<string, number>;
  };
}

type HeroLiveStatsRotatingListItemProps = {
  /** Hide below `min` to shorten mobile hero; full layout from `min` and up. */
  className?: string;
};

/**
 * Hero bullet: same rotating live reports as OnlineUsersCount marketing
 * (learners + Speaking / Writing / Listening / Reading).
 */
export function HeroLiveStatsRotatingListItem({
  className,
}: HeroLiveStatsRotatingListItemProps) {
  const [data, setData] = useState<LiveStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);
  /** Stable for SSR + first client paint; randomize after mount to avoid hydration mismatch. */
  const [avatarPickSeed, setAvatarPickSeed] = useState(0);

  useEffect(() => {
    setAvatarPickSeed(Math.floor(Math.random() * 2_147_483_647));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const loadStats = async () => {
      try {
        const response = await fetch("/api/analytics/live-stats");
        if (!response.ok) throw new Error("failed");
        const next = (await response.json()) as LiveStatsResponse;
        if (cancelled) return;
        setData(next);
        setIsError(false);
      } catch {
        if (!cancelled) setIsError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadStats();
    intervalId = setInterval(() => {
      void loadStats();
    }, 10_000);

    const onResume = () => {
      if (document.visibilityState === "visible") void loadStats();
    };
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, []);

  const stats = data?.stats ?? {
    onlineUsers: 0,
  };

  const speakingCount = stats.skillBreakdown?.Speaking ?? 0;
  const writingCount = stats.skillBreakdown?.Writing ?? 0;
  const listeningCount = stats.skillBreakdown?.Listening ?? 0;
  const readingCount = stats.skillBreakdown?.Reading ?? 0;

  const messages = useMemo(
    () => [
      {
        text: `Join ${stats.onlineUsers.toLocaleString()}+ learners studying right now!`,
        icon: Insights,
      },
      {
        text: `${speakingCount.toLocaleString()}+ practicing Speaking right now!`,
        icon: Mic,
      },
      {
        text: `${writingCount.toLocaleString()}+ practicing Writing right now!`,
        icon: BorderColor,
      },
      {
        text: `${listeningCount.toLocaleString()}+ practicing Listening right now!`,
        icon: Headphones,
      },
      {
        text: `${readingCount.toLocaleString()}+ practicing Reading right now!`,
        icon: MenuBook,
      },
    ],
    [
      stats.onlineUsers,
      speakingCount,
      writingCount,
      listeningCount,
      readingCount,
    ],
  );

  useEffect(() => {
    if (!stats.onlineUsers) return;

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setAvatarPickSeed((s) => s + 1);
        setFade(true);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [stats.onlineUsers, messages.length]);

  const practiceAvatars = useMemo(
    () => pickFiveAvatars(avatarPickSeed),
    [avatarPickSeed],
  );

  const statForSlide = useMemo(
    () =>
      [
        stats.onlineUsers,
        speakingCount,
        writingCount,
        listeningCount,
        readingCount,
      ][currentMessageIndex] ?? 0,
    [
      currentMessageIndex,
      stats.onlineUsers,
      speakingCount,
      writingCount,
      listeningCount,
      readingCount,
    ],
  );

  if (isError || isLoading) return null;
  if (!stats.onlineUsers) return null;

  const CurrentIcon = messages[currentMessageIndex].icon;

  return (
    <li className={cn("list-none", className)}>
      <div
        className={`flex flex-col gap-1.5 transition-opacity duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex w-full justify-start">
          <AvatarGroup
            key={`${currentMessageIndex}-${avatarPickSeed}`}
            max={4}
            renderSurplus={() => `${statForSlide.toLocaleString()}+`}
            slotProps={{
              surplus: {
                sx: {
                  width: "auto",
                  minWidth: 44,
                  maxWidth: "none",
                  minHeight: 24,
                  height: 24,
                  borderRadius: 999,
                  px: 1,
                  boxSizing: "border-box",
                  fontSize:
                    statForSlide >= 1000
                      ? "0.5625rem"
                      : statForSlide >= 100
                        ? "0.625rem"
                        : "0.6875rem",
                  lineHeight: 1.15,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                },
              },
            }}
            sx={{
              /* Photo avatars only — surplus is text-only (no img), so it keeps width: auto */
              "& .MuiAvatar-root:has(img)": {
                width: 24,
                height: 24,
                fontSize: 11,
                borderWidth: 1.5,
                borderColor: "#F4F7FF",
              },
            }}
          >
            {practiceAvatars.map((a, i) => (
              <Avatar key={`${avatarPickSeed}-${i}-${a.src}`} alt={a.alt} src={a.src} />
            ))}
          </AvatarGroup>
        </div>
        <div className="flex min-h-[1.125rem] items-center gap-1 text-text2 text-[11px] screen1280:text-[13px] font-normal">
          <CurrentIcon className="h-3 w-3 shrink-0 text-text1" aria-hidden />
          <span>{messages[currentMessageIndex].text}</span>
        </div>
      </div>
    </li>
  );
}
