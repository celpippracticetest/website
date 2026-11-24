"use client";

/**
 * Black Friday 2026 — TEMPORARY (revert Mon 2026-11-30).
 * Dismissible top bar on the homepage for eligible visitors.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock, X } from "lucide-react";
import useStore from "@/store";
import { useBlackFridayOffer } from "@/hooks/useBlackFridayOffer";
import { useBlackFridayCountdown } from "./useBlackFridayCountdown";

const DISMISS_KEY = "bf26_home_bar_dismissed";
/** The landing header and page read this to sit below the fixed bar. */
const HEIGHT_VAR = "--bf26-bar-h";

export function BlackFridayHomeBar() {
  const { eligible } = useBlackFridayOffer();
  const countdown = useBlackFridayCountdown();
  const openPremiumPlanModal = useStore((s) => s.openPremiumPlanModal);
  const [dismissed, setDismissed] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const visible = eligible && !dismissed && Boolean(countdown) && !countdown?.ended;

  useEffect(() => {
    const root = document.documentElement;
    const el = barRef.current;
    if (!visible || !el) {
      root.style.removeProperty(HEIGHT_VAR);
      return;
    }
    const update = () => root.style.setProperty(HEIGHT_VAR, `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty(HEIGHT_VAR);
    };
  }, [visible]);

  if (!visible || !countdown) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // private mode: hide for this page view only
    }
  };

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Black Friday sale"
      className="fixed inset-x-0 top-0 z-[60] flex min-h-[56px] w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 bg-[#0c1628] py-2 pr-12 pl-3 text-white screen744:pr-14 screen744:pl-4"
    >
      <div className="flex items-center justify-center gap-2 screen744:gap-3">
        <span className="rounded-full bg-[#c2432f] px-2 py-0.5 text-[11px] leading-4 font-bold tracking-[0.08em] whitespace-nowrap screen744:px-3 screen744:py-1 screen744:text-[12px]">
          BLACK FRIDAY
        </span>
        <span className="text-[14px] leading-5 font-medium screen744:text-[15px]">
          <strong className="font-bold">50% off</strong> every plan
          <span className="hidden screen744:inline"> until November 29</span>
        </span>
      </div>
      <div className="flex items-center justify-center gap-3 screen744:gap-4">
        <div
          role="timer"
          aria-label="Time left in the sale"
          className="flex items-center gap-2 text-[14px] leading-5 text-[#c9d5f5]"
        >
          <Clock className="hidden h-4 w-4 screen744:block" aria-hidden />
          <span className="hidden screen744:inline">Ends in</span>
          <span className="inline-flex gap-1 text-[12px] font-bold text-white tabular-nums screen744:text-[14px]">
            {(["days", "hours", "mins", "secs"] as const).map((k) => (
              <span
                key={k}
                className={`rounded-[6px] border bg-white/[0.08] px-1.5 py-0.5 screen744:px-2 screen744:py-1 ${
                  k === "secs" ? "border-[#e9845e]" : "border-white/[0.16]"
                }`}
              >
                {countdown[k]}
                {k[0]}
              </span>
            ))}
          </span>
        </div>
        <button
          type="button"
          onClick={openPremiumPlanModal}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-white px-3 py-1.5 text-[13px] leading-5 font-bold whitespace-nowrap text-[#0c1628] shadow-[3px_3px_0_0_rgba(140,50,15,0.45)] screen744:gap-2 screen744:px-4 screen744:py-2 screen744:text-[14px]"
        >
          Claim 50% Off
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        aria-label="Dismiss sale banner"
        onClick={dismiss}
        className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#c9d5f5]"
      >
        <X className="h-[18px] w-[18px]" aria-hidden />
      </button>
    </div>
  );
}
