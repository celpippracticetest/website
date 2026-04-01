/** Crisp live chat — shared helpers for CrispChat + FloatingChatIcon (single custom launcher). */

export const CRISP_WEBSITE_ID =
  process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ??
  "51f44922-1428-4169-b9a8-4e364e6d5703";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

let crispCloseListenerAttached = false;

function attachCrispHideLauncherOnClose(): void {
  if (typeof window === "undefined" || crispCloseListenerAttached) return;
  if (!window.$crisp) return;
  crispCloseListenerAttached = true;
  window.$crisp.push([
    "on",
    "chat:closed",
    () => {
      window.$crisp?.push(["do", "chat:hide"]);
    },
  ]);
}

export function hideCrispChat(): void {
  if (typeof window === "undefined" || !window.$crisp) return;
  window.$crisp.push(["do", "chat:hide"]);
}

/** Load Crisp once; keep default widget hidden until {@link openCrispChat} (custom button). */
export function ensureCrispScript(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("crisp-chat-script")) {
    if (!window.$crisp) window.$crisp = [];
    attachCrispHideLauncherOnClose();
    return;
  }
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  attachCrispHideLauncherOnClose();
  const s = document.createElement("script");
  s.id = "crisp-chat-script";
  s.src = "https://client.crisp.chat/l.js";
  s.async = true;
  document.head.appendChild(s);
}

/** Open Crisp from the floating support button (after optional {@link ensureCrispScript}). */
export function openCrispChat(): void {
  if (typeof window === "undefined") return;
  ensureCrispScript();
  if (!window.$crisp) return;
  window.$crisp.push(["do", "chat:show"]);
  window.$crisp.push(["do", "chat:open"]);
}
