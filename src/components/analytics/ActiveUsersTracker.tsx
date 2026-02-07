"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * ActiveUsersTracker Component
 * Sends heartbeat every 30 seconds to track user activity
 * and sends event to Google Analytics
 */
export default function ActiveUsersTracker() {
  const { userId } = useAuth();
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sessionId = sessionIdRef.current;

    // Send initial heartbeat
    sendHeartbeat(sessionId);

    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat(sessionId);
    }, 30000); // 30 seconds

    // Cleanup on unmount - mark user as offline
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      markOffline(sessionId);
    };
  }, [userId]);

  // Handle visibility change - send heartbeat when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat(sessionIdRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const sendHeartbeat = async (sessionId: string) => {
    try {
      await fetch("/api/analytics/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    }
  };

  const markOffline = async (sessionId: string) => {
    try {
      await fetch("/api/analytics/heartbeat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error("Failed to mark offline:", error);
    }
  };

  return null; // This component doesn't render anything
}
