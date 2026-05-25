"use client";

import People from "@mui/icons-material/People";
import PersonAdd from "@mui/icons-material/PersonAdd";
import Insights from "@mui/icons-material/Insights";
import TrendingUp from "@mui/icons-material/TrendingUp";
import Headphones from "@mui/icons-material/Headphones";
import MenuBook from "@mui/icons-material/MenuBook";
import BorderColor from "@mui/icons-material/BorderColor";
import Mic from "@mui/icons-material/Mic";
import { Box } from "@/components/ui/Box";
import { useState, useEffect, useRef } from "react";
import { LIVE_STATS_POLL_MS } from "@/hooks/useRecentSignupsLiveStat";

interface LiveStatsResponse {
  success: boolean;
  stats: {
    onlineUsers: number;
    recentSignups: number;
    practicingUsers: number;
    recentPractices: number;
    skillBreakdown?: Record<string, number>;
  };
  timestamp: string;
}

interface OnlineUsersCountProps {
  /** Refresh interval in milliseconds (default matches GA4 server cache cadence). */
  refreshInterval?: number;
  /** Show icon */
  showIcon?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Variant style */
  variant?: "default" | "badge" | "minimal" | "marketing";
}

/**
 * OnlineUsersCount Component
 * Displays real-time statistics for marketing motivation
 * - Active online users
 * - Recent signups
 * - Users doing practices
 * Uses React Query to poll the API every 10 seconds
 */
export default function OnlineUsersCount({
  refreshInterval = LIVE_STATS_POLL_MS,
  showIcon = true,
  className = "",
  variant = "default",
}: OnlineUsersCountProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [data, setData] = useState<LiveStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastGoodDataRef = useRef<LiveStatsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const loadStats = async () => {
      try {
        const response = await fetch("/api/analytics/live-stats");
        if (!response.ok) return;

        const nextData = (await response.json()) as LiveStatsResponse;
        if (cancelled) return;

        // Only replace lastGoodData when the response has a real onlineUsers count
        if (nextData.stats?.onlineUsers > 0) {
          lastGoodDataRef.current = nextData;
        }
        // Always render with the best data we have (last good OR current)
        setData(lastGoodDataRef.current ?? nextData);
      } catch {
        // keep last known good data — no state update
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadStats();
    intervalId = setInterval(() => { void loadStats(); }, refreshInterval);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshInterval]);

  const stats = data?.stats ?? { onlineUsers: 0, recentSignups: 0, practicingUsers: 0, recentPractices: 0 };

  // Get individual skill counts from skillBreakdown (REAL data from API)
  const speakingCount = stats.skillBreakdown?.Speaking || 0;
  const writingCount = stats.skillBreakdown?.Writing || 0;
  const listeningCount = stats.skillBreakdown?.Listening || 0;
  const readingCount = stats.skillBreakdown?.Reading || 0;

  const totalPracticing = speakingCount + writingCount + listeningCount + readingCount;

  // Rotating messages with icons (define outside conditional for hook stability)
  const messages = [
    {
      text: `Join ${stats.onlineUsers.toLocaleString()}+ learners studying right now!`,
      icon: Insights,
      color: "text-orange-600",
    },
    {
      text: `${speakingCount.toLocaleString()}+ practicing Speaking right now!`,
      icon: Mic,
      color: "text-red-600",
    },
    {
      text: `${writingCount.toLocaleString()}+ practicing Writing right now!`,
      icon: BorderColor,
      color: "text-teal-600",
    },
    {
      text: `${listeningCount.toLocaleString()}+ practicing Listening right now!`,
      icon: Headphones,
      color: "text-blue-600",
    },
    {
      text: `${readingCount.toLocaleString()}+ practicing Reading right now!`,
      icon: MenuBook,
      color: "text-purple-600",
    },
  ];

  const CurrentIcon = messages[currentMessageIndex].icon;

  useEffect(() => {
    if (variant !== "marketing") return;

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setFade(true);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length, variant]);

  if (isLoading) return null;

  // Hide entirely when GA4 has no meaningful data at all
  if (!stats.onlineUsers && !stats.recentSignups && !totalPracticing) return null;

  // Marketing variant - Show all stats with motivation (landing section style)
  if (variant === "marketing") {

    return (
      <Box
        className={`flex flex-col gap-4 pt-[16px] px-[24px] pb-[29px] rounded-[16px] bg-white ${className}`}
      >
        <Box className="flex items-center gap-2 text-text1 font-medium text-[18px] screen1280:!text-[20px]">
          <TrendingUp className="h-5 w-5 text-text1" />
          <span>Real-time stats</span>
        </Box>

        <Box className="flex flex-wrap gap-3">
          {/* Online Users */}
          <Box className="flex flex-col items-center flex-1 min-w-[80px] p-3 rounded-[16px] bg-[#F4F7FF]">
            <Box className="relative">
              <People className="h-5 w-5 text-text1" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </Box>
            <span className="text-[18px] screen1280:!text-[20px] font-bold text-text1 mt-1">
              {stats.onlineUsers.toLocaleString()}
            </span>
            <span className="text-text2 text-[12px] screen1280:!text-[14px]">Active Now</span>
          </Box>

          {/* Recent Signups */}
          <Box className="flex flex-col items-center flex-1 min-w-[80px] p-3 rounded-[16px] bg-[#F4F7FF]">
            <PersonAdd className="h-5 w-5 text-text1" />
            <span className="text-[18px] screen1280:!text-[20px] font-bold text-text1 mt-1">
              {stats.recentSignups.toLocaleString()}
            </span>
            <span className="text-text2 text-[12px] screen1280:!text-[14px]">Joined Today</span>
          </Box>

          {/* Practicing Users */}
          <Box className="flex flex-col items-center flex-1 min-w-[80px] p-3 rounded-[16px] bg-[#F4F7FF]">
            <Box className="relative">
              <Insights className="h-5 w-5 text-text1" />
              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
              </span>
            </Box>
            <span className="text-[18px] screen1280:!text-[20px] font-bold text-text1 mt-1">
              {totalPracticing.toLocaleString()}
            </span>
            <span className="text-text2 text-[12px] screen1280:!text-[14px]">Practicing Now</span>
          </Box>
        </Box>

        <Box
          className={`flex items-center justify-center gap-1.5 text-text2 text-[12px] screen1280:!text-[14px] font-normal transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
        >
          <CurrentIcon className="h-3.5 w-3.5 flex-shrink-0 text-text1" />
          <span>{messages[currentMessageIndex].text}</span>
        </Box>
      </Box>
    );
  }

  // Badge variant
  if (variant === "badge") {
    return (
      <Box
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium ${className}`}
      >
        {showIcon && <People className="h-4 w-4" />}
        <span className="relative flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>{stats.onlineUsers.toLocaleString()} online</span>
        </span>
      </Box>
    );
  }

  // Minimal variant
  if (variant === "minimal") {
    return (
      <Box className={`inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 ${className}`}>
        {showIcon && <People className="h-4 w-4" />}
        <span>{stats.onlineUsers.toLocaleString()} online</span>
      </Box>
    );
  }

  // Default variant
  return (
    <Box
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm ${className}`}
    >
      {showIcon && (
        <Box className="relative">
          <People className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </Box>
      )}
      <Box>
        <Box className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {stats.onlineUsers.toLocaleString()}
        </Box>
        <Box className="text-xs text-gray-500 dark:text-gray-400">
          Users Online
        </Box>
      </Box>
    </Box>
  );
}
