"use client";

import { useEffect, useRef } from "react";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";

const HEARTBEAT_INTERVAL_MS = 120_000;

/**
 * ActiveUsersTracker Component
 * Sends heartbeat periodically to track user activity
 * and sends event to Google Analytics
 */
export default function ActiveUsersTracker() {
  const { user } = useHybridWebUser();
  const userId = user?.id ?? null;
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedFetchFailureRef = useRef(false);
  const botUserAgentRegex =
    /bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex/i;

  const isBotClient =
    typeof navigator !== "undefined" &&
    botUserAgentRegex.test(navigator.userAgent || "");

  const logFetchFailure = (message: string, error: unknown) => {
    if (process.env.NODE_ENV !== "development") return;

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    const isLikelyNetworkFailure = error instanceof TypeError;

    if (isOffline || isLikelyNetworkFailure) {
      if (!hasLoggedFetchFailureRef.current) {
        console.warn(`${message} skipped due to a temporary network issue or blocked request.`);
        hasLoggedFetchFailureRef.current = true;
      }
      return;
    }

    console.error(message, error);
  };

  useEffect(() => {
    if (isBotClient) return;

    const sessionId = sessionIdRef.current;

    const startHeartbeatInterval = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        sendHeartbeat(sessionId);
      }, HEARTBEAT_INTERVAL_MS);
    };

    if (document.visibilityState === "visible") {
      sendHeartbeat(sessionId);
      startHeartbeatInterval();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat(sessionId);
        startHeartbeatInterval();
        return;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      markOffline(sessionId);
    };
  }, [isBotClient, userId]);

  const sendHeartbeat = async (sessionId: string) => {
    try {
      const response = await fetch("/api/analytics/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (response.ok) {
        hasLoggedFetchFailureRef.current = false;
      }
      if (!response.ok && process.env.NODE_ENV === "development") {
        console.warn("Heartbeat request was not successful");
      }
    } catch (error) {
      logFetchFailure("Failed to send heartbeat:", error);
    }
  };

  const markOffline = async (sessionId: string) => {
    try {
      const response = await fetch("/api/analytics/heartbeat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      });
      if (response.ok) {
        hasLoggedFetchFailureRef.current = false;
      }
      if (!response.ok && process.env.NODE_ENV === "development") {
        console.warn("Offline heartbeat request was not successful");
      }
    } catch (error) {
      logFetchFailure("Failed to mark offline:", error);
    }
  };

  return null; // This component doesn't render anything
}
