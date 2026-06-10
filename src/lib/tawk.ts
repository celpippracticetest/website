/** Tawk.to live chat — shared helpers for site-wide embed and header support links. */

export const TAWK_EMBED_SRC =
  process.env.NEXT_PUBLIC_TAWK_EMBED_SRC ??
  "https://embed.tawk.to/6a19d80abfd8e61c339dc625/1jpqf7qn1";

/** Matches {@link useIsMobile} — floating bubble is header-only below this width. */
export const TAWK_MOBILE_BREAKPOINT = 768;

/** Below SupportFloatButton (`z-[1150]`) so our FAB stays on top. */
const TAWK_WIDGET_Z_INDEX = 1140;

const TAWK_LAUNCHER_SELECTORS = [
  "#tawkchat-minified-wrapper",
  "#tawkchat-minified-container",
  ".tawk-min-container",
] as const;

declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void;
      minimize?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      isChatMaximized?: () => boolean;
      setAttributes?: (
        attributes: Record<string, string>,
        callback?: (error?: Error) => void,
      ) => void;
      onBeforeLoad?: () => void;
      onLoad?: () => void;
      onChatMaximized?: () => void;
      onChatMinimized?: () => void;
      onChatHidden?: () => void;
      visitor?: { name?: string; email?: string };
      customStyle?: { zIndex?: number | string };
    };
    Tawk_LoadStart?: Date;
  }
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < TAWK_MOBILE_BREAKPOINT;
}

function chainTawkCallback(
  key:
    | "onBeforeLoad"
    | "onLoad"
    | "onChatMaximized"
    | "onChatMinimized"
    | "onChatHidden",
  fn: () => void,
): void {
  window.Tawk_API = window.Tawk_API || {};
  const prev = window.Tawk_API[key];
  window.Tawk_API[key] = function () {
    if (typeof prev === "function") prev();
    fn();
  };
}

/** Hide Tawk's default launcher bubble (Support FAB opens chat instead). */
function hideTawkLauncherBubble(): void {
  if (typeof document === "undefined") return;

  for (const selector of TAWK_LAUNCHER_SELECTORS) {
    document.querySelectorAll(selector).forEach((node) => {
      const el = node as HTMLElement;
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("pointer-events", "none", "important");
    });
  }
}

function scheduleHideTawkLauncherBubble(): void {
  hideTawkLauncherBubble();
  requestAnimationFrame(hideTawkLauncherBubble);
  window.setTimeout(hideTawkLauncherBubble, 0);
  window.setTimeout(hideTawkLauncherBubble, 100);
  window.setTimeout(hideTawkLauncherBubble, 500);
}

function syncTawkWidgetForViewport(): void {
  window.Tawk_API?.hideWidget?.();
  hideTawkLauncherBubble();
}

function dismissTawkWidget(): void {
  window.Tawk_API?.minimize?.();
  window.Tawk_API?.hideWidget?.();
  hideTawkLauncherBubble();
}

let widgetBehaviorInitialized = false;

/** Keep Tawk's default bubble hidden; reopen from Support FAB / header links. Idempotent. */
export function initTawkMobileBehavior(): void {
  if (typeof window === "undefined" || widgetBehaviorInitialized) return;
  widgetBehaviorInitialized = true;

  ensureTawkScript();
  chainTawkCallback("onBeforeLoad", syncTawkWidgetForViewport);
  chainTawkCallback("onLoad", syncTawkWidgetForViewport);
  chainTawkCallback("onChatMaximized", scheduleHideTawkLauncherBubble);
  chainTawkCallback("onChatMinimized", dismissTawkWidget);
  chainTawkCallback("onChatHidden", dismissTawkWidget);

  if (typeof window.Tawk_API?.maximize === "function") {
    syncTawkWidgetForViewport();
  }

  window.addEventListener("resize", syncTawkWidgetForViewport);
}

function runWhenTawkReady(fn: () => void): void {
  if (typeof window === "undefined") return;
  window.Tawk_API = window.Tawk_API || {};
  if (typeof window.Tawk_API.maximize === "function") {
    fn();
    return;
  }
  const prev = window.Tawk_API.onLoad;
  window.Tawk_API.onLoad = function () {
    if (typeof prev === "function") prev();
    fn();
  };
}

/**
 * Official Tawk.to embed pattern (`Tawk_API` queue + embed script).
 * Idempotent: safe to call from {@link TawkLoader} and header support links.
 */
export function ensureTawkScript(): void {
  if (typeof document === "undefined") return;
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

  window.Tawk_API.customStyle = {
    ...window.Tawk_API.customStyle,
    zIndex: TAWK_WIDGET_Z_INDEX,
  };

  if (document.getElementById("tawk-chat-script")) return;

  const s0 = document.getElementsByTagName("script")[0];
  if (!s0?.parentNode) return;

  const s1 = document.createElement("script");
  s1.type = "text/javascript";
  s1.id = "tawk-chat-script";
  s1.async = true;
  s1.src = TAWK_EMBED_SRC;
  s1.charset = "UTF-8";
  s1.setAttribute("crossorigin", "*");
  s0.parentNode.insertBefore(s1, s0);
}

/** Open Tawk from Support FAB / header links (after optional {@link ensureTawkScript}). */
export function openTawkChat(): void {
  if (typeof window === "undefined") return;
  ensureTawkScript();
  runWhenTawkReady(() => {
    // maximize() opens the panel without leaving the default launcher visible.
    window.Tawk_API?.maximize?.();
    scheduleHideTawkLauncherBubble();

    // Fallback when the widget was fully hidden and maximize alone does not surface UI.
    window.setTimeout(() => {
      if (window.Tawk_API?.isChatMaximized?.()) return;
      window.Tawk_API?.showWidget?.();
      window.Tawk_API?.maximize?.();
      scheduleHideTawkLauncherBubble();
    }, 50);
  });
}

/** Close Tawk chat and hide the widget. */
export function closeTawkChat(): void {
  if (typeof window === "undefined") return;
  runWhenTawkReady(dismissTawkWidget);
}

export type TawkVisitorAttribute = [string, string | number | boolean];

/**
 * Push visitor profile into Tawk (`setAttributes` + optional visitor name/email).
 * Call after {@link ensureTawkScript} (queued safely before load via `onLoad`).
 */
export function applyTawkVisitorProfile(opts: {
  email?: string | null;
  nickname?: string | null;
  attributes: TawkVisitorAttribute[];
}): void {
  if (typeof window === "undefined") return;

  const { email, nickname, attributes } = opts;
  const payload: Record<string, string> = {};

  if (nickname?.trim()) payload.name = nickname.trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    payload.email = email;
  }

  for (const [key, value] of attributes) {
    payload[key] = String(value);
  }

  if (Object.keys(payload).length === 0) return;

  ensureTawkScript();
  runWhenTawkReady(() => {
    window.Tawk_API?.setAttributes?.(payload);
  });
}
