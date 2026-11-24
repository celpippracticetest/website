"use client";

/**
 * Black Friday 2026 — TEMPORARY (revert Mon 2026-11-30).
 * Dark sale hero with countdown, shown above the plans instead of the
 * normal pricing header for eligible visitors.
 */

import { Clock, Users } from "lucide-react";
import { useBlackFridayCountdown } from "./useBlackFridayCountdown";

type Props = {
  titleTag?: "h1" | "h2";
  className?: string;
};

const UNITS = [
  ["days", "days"],
  ["hours", "hours"],
  ["mins", "min"],
  ["secs", "sec"],
] as const;

export function BlackFridayPricingHero({ titleTag = "h2", className = "" }: Props) {
  const TitleTag = titleTag;
  const countdown = useBlackFridayCountdown();

  return (
    <section
      className={`w-full rounded-[20px] bg-[#0c1628] px-6 py-10 screen744:px-10 screen744:py-12 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-8">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#c2432f] px-3 py-1 text-[12px] font-bold tracking-[0.08em] text-white">
              BLACK FRIDAY SALE
            </span>
            <span className="text-[14px] font-medium text-[#c9d5f5]">
              Now through November 29
            </span>
          </div>
          <TitleTag className="m-0 text-[36px] leading-[1.1] font-bold tracking-[-0.02em] text-white screen744:text-[52px]">
            <span className="pr-[0.12em] italic text-[#e9845e]">50% Off</span>{" "}
            Every Plan
          </TitleTag>
          <p className="m-0 max-w-[560px] text-[16px] leading-[26px] text-[#c9d5f5] screen744:text-[18px] screen744:leading-[28px]">
            Half price on full CELPIP prep: every mock exam, every practice test
            and instant AI scoring for Writing and Speaking.
          </p>
          <div className="flex items-center gap-2 text-[14px] text-[#c9d5f5]">
            <Users className="h-[18px] w-[18px]" aria-hidden />
            <span>
              Trusted by <strong className="text-white">70k+</strong> test-takers
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {countdown?.ended ? (
            <p className="m-0 text-[18px] font-semibold text-white">
              This offer has ended
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#c9d5f5]">
                <Clock className="h-4 w-4" aria-hidden />
                <span>SALE ENDS IN</span>
              </div>
              <div role="timer" aria-label="Time left in the sale" className="flex gap-2">
                {UNITS.map(([key, label]) => (
                  <div
                    key={key}
                    className={`flex w-[64px] flex-col items-center gap-1 rounded-[12px] border bg-white/[0.06] py-3 screen744:w-[76px] ${
                      key === "secs" ? "border-[#e9845e]" : "border-white/[0.16]"
                    }`}
                  >
                    <span
                      className={`text-[26px] leading-[34px] font-bold tabular-nums screen744:text-[32px] screen744:leading-[40px] ${
                        key === "secs" ? "text-[#e9845e]" : "text-white"
                      }`}
                    >
                      {countdown ? countdown[key] : "--"}
                    </span>
                    <span className="text-[12px] font-medium text-[#c9d5f5]">{label}</span>
                  </div>
                ))}
              </div>
              <p className="m-0 text-[14px] text-[#c9d5f5]">
                Ends November 29 at 11:59 PM ET
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
