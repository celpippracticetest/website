"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const CRISP_WEBSITE_ID =
  process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ??
  "51f44922-1428-4169-b9a8-4e364e6d5703";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

/** Skill practice flows and full mock exam routes — hide Crisp during focused test-taking. */
function isCrispBlockedPath(pathname: string): boolean {
  if (pathname.startsWith("/exams")) return true;
  const blockedPrefixes = [
    "/listening",
    "/reading",
    "/writing",
    "/speaking",
  ] as const;
  return blockedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function hideCrispChat(): void {
  if (typeof window === "undefined" || !window.$crisp) return;
  window.$crisp.push(["do", "chat:hide"]);
}

function showCrispChat(): void {
  if (typeof window === "undefined" || !window.$crisp) return;
  window.$crisp.push(["do", "chat:show"]);
}

function ensureCrispScript(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("crisp-chat-script")) return;
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  const s = document.createElement("script");
  s.id = "crisp-chat-script";
  s.src = "https://client.crisp.chat/l.js";
  s.async = true;
  document.head.appendChild(s);
}

export default function CrispChat() {
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      hideCrispChat();
      return;
    }

    if (isCrispBlockedPath(pathname)) {
      hideCrispChat();
      return;
    }

    ensureCrispScript();
    showCrispChat();
  }, [isLoaded, isSignedIn, pathname]);

  return null;
}
