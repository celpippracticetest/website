/** Tawk.to live chat — shared helpers for site-wide embed and header support links. */

export const TAWK_EMBED_SRC =
  process.env.NEXT_PUBLIC_TAWK_EMBED_SRC ??
  "https://embed.tawk.to/6a19d80abfd8e61c339dc625/1jpqf7qn1";

declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void;
      minimize?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      setAttributes?: (
        attributes: Record<string, string>,
        callback?: (error?: Error) => void,
      ) => void;
      onLoad?: () => void;
      onChatMinimized?: () => void;
      visitor?: { name?: string; email?: string };
    };
    Tawk_LoadStart?: Date;
  }
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

/** Open Tawk from header support links (after optional {@link ensureTawkScript}). */
export function openTawkChat(): void {
  if (typeof window === "undefined") return;
  ensureTawkScript();
  runWhenTawkReady(() => {
    window.Tawk_API?.showWidget?.();
    window.Tawk_API?.maximize?.();
  });
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
