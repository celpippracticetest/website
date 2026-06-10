"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { syncWebSessionCookies } from "@/lib/auth/sync-web-session-cookies";
import { safeAppWebRedirectPath } from "@/lib/auth/safeAppWebRedirect";

type Status = "working" | "error";

/**
 * Establishes a Supabase browser session from tokens in the URL hash (from the
 * native app) then redirects to `?next=/…`.
 */
export function AppSessionBridge() {
  return (
    <Suspense fallback={<AppSessionScreen title="Preparing your session" message="Signing you in…" />}>
      <AppSessionBridgeInner />
    </Suspense>
  );
}

function AppSessionBridgeInner() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const [status, setStatus] = useState<Status>("working");
  const [message, setMessage] = useState("Signing you in…");
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fail = (msg: string) => {
      if (cancelled || !mountedRef.current) {
        return;
      }
      setStatus("error");
      setMessage(msg);
    };

    async function run() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        fail("Sign-in is not configured on this site.");
        return;
      }

      const rawHash =
        typeof window !== "undefined"
          ? window.location.hash?.replace(/^#/, "") ?? ""
          : "";
      if (!rawHash.includes("access_token")) {
        fail("Missing sign-in tokens. Open the exam again from the app.");
        return;
      }

      const params = new URLSearchParams(rawHash);
      const access_token = params.get("access_token")?.trim();
      const refresh_token = params.get("refresh_token")?.trim();
      if (!access_token || !refresh_token) {
        fail("Invalid sign-in tokens. Open the exam again from the app.");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (cancelled) {
        return;
      }

      if (error) {
        fail(error.message || "Could not sign you in.");
        return;
      }

      await syncWebSessionCookies();

      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      );

      const next =
        safeAppWebRedirectPath(nextParam) ?? "/exam-overview";
      // Navigate without setState — avoids updates during unmount/navigation.
      window.location.replace(next);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [nextParam]);

  return (
    <AppSessionScreen
      title={
        status === "working"
          ? "Preparing your session"
          : "Could not sign in"
      }
      message={message}
      isError={status === "error"}
    />
  );
}

function AppSessionScreen({
  title,
  message,
  isError = false,
}: {
  title: string;
  message: string;
  isError?: boolean;
}) {
  const titleColor = isError ? "#c0392b" : "#111";

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        padding: "24px",
        textAlign: "center",
        background: "#f9f9f9",
      }}
    >
      <p
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: titleColor,
          marginBottom: "8px",
        }}
      >
        {title}
      </p>
      <p style={{ fontSize: "14px", color: "#555" }}>{message}</p>
    </main>
  );
}
