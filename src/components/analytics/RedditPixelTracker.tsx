"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const DEFAULT_REDDIT_PIXEL_ID = "a2_iu8nembnuzy2";
const REDDIT_PIXEL_SRC = "https://www.redditstatic.com/ads/pixel.js";
const REDDIT_PIXEL_SCRIPT_ATTR = "data-reddit-pixel-id";

type RedditInitPayload = {
  email?: string;
  phoneNumber?: string;
  externalId?: string;
};

type RedditCommand =
  | ["init", string]
  | ["init", string, RedditInitPayload]
  | ["track", "PageVisit"];

type RedditFn = {
  (...args: RedditCommand): void;
  callQueue?: RedditCommand[];
  sendEvent?: (...args: RedditCommand) => void;
};

declare global {
  interface Window {
    rdt?: RedditFn;
    __redditPixelInitialized?: boolean;
  }
}

function ensureRedditBootstrap(pixelId: string): RedditFn {
  const existing = window.rdt;
  if (existing) {
    return existing;
  }

  const queueFn: RedditFn = function (...args: RedditCommand): void {
    if (typeof queueFn.sendEvent === "function") {
      queueFn.sendEvent(...args);
      return;
    }
    queueFn.callQueue?.push(args);
  };
  queueFn.callQueue = [];
  window.rdt = queueFn;

  if (!document.querySelector(`script[${REDDIT_PIXEL_SCRIPT_ATTR}="${pixelId}"]`)) {
    const script = document.createElement("script");
    script.src = `${REDDIT_PIXEL_SRC}?pixel_id=${encodeURIComponent(pixelId)}`;
    script.async = true;
    script.setAttribute(REDDIT_PIXEL_SCRIPT_ATTR, pixelId);
    document.head.appendChild(script);
  }

  return queueFn;
}

function buildRedditInitPayload(user: ReturnType<typeof useUser>["user"]): RedditInitPayload {
  if (!user) return {};

  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  const phone = user.primaryPhoneNumber?.phoneNumber;

  return {
    email: email || undefined,
    phoneNumber: phone || undefined,
    externalId: user.id || undefined,
  };
}

export default function RedditPixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const pixelId = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID || DEFAULT_REDDIT_PIXEL_ID;

  useEffect(() => {
    if (!isLoaded || !pixelId) return;

    const rdt = ensureRedditBootstrap(pixelId);
    const payload = buildRedditInitPayload(user);

    if (!window.__redditPixelInitialized) {
      const hasPayloadValues = Object.values(payload).some(Boolean);
      if (hasPayloadValues) {
        rdt("init", pixelId, payload);
      } else {
        rdt("init", pixelId);
      }
      window.__redditPixelInitialized = true;
    }
  }, [isLoaded, pixelId, user]);

  useEffect(() => {
    if (!pixelId) return;

    const rdt = ensureRedditBootstrap(pixelId);
    const pageVisitPath = `${pathname ?? ""}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (!pageVisitPath) return;

    rdt("track", "PageVisit");
  }, [pathname, pixelId, searchParams]);

  return null;
}
