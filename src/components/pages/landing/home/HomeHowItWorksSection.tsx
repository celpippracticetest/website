"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useEventTracker } from "@/hooks/useTracking";

const steps = [
  {
    number: "01",
    title: "Pick a Skill or Full Mock",
    description:
      "Jump into Listening, Reading, Writing, or Speaking — or run a timed mock that mirrors the real CELPIP flow.",
    color: "#3B82F6",
  },
  {
    number: "02",
    title: "Practice with Instant Scoring",
    description:
      "Submit responses and get fast AI feedback on open-ended tasks, plus auto-scored MCQs with detailed explanations.",
    color: "#8B5CF6",
  },
  {
    number: "03",
    title: "Review, Compare, Repeat",
    description:
      "Read explanations, compare to sample answers, and track progress so each session targets your weakest spots.",
    color: "#10B981",
  },
] as const;

function JoinedTodayMicrocopy() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/analytics/live-stats");
        if (!res.ok) return;
        const data = (await res.json()) as {
          stats?: { recentSignups?: number };
        };
        if (!cancelled && data.stats?.recentSignups != null) {
          setCount(data.stats.recentSignups);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const display = count != null ? count.toLocaleString() : "3,358";
  return (
    <p className="mt-3 text-sm text-slate-500">
      Join {display} people who started today
    </p>
  );
}

export function HomeHowItWorksSection() {
  const { trackCTA } = useEventTracker();

  return (
    <section
      aria-labelledby="how-redesign-heading"
      className="border-t border-slate-200 bg-white py-14 screen744:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-4 screen744:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center screen744:mb-14">
          <span className="mb-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Simple Process
          </span>
          <h2
            id="how-redesign-heading"
            className="text-balance text-3xl font-extrabold text-slate-900 screen744:text-4xl"
          >
            Start Improving in{" "}
            <span className="text-emerald-600">3 Minutes</span>
          </h2>
          <p className="mt-3 text-base text-slate-600 screen744:text-lg">
            No appointments, no setup. Just structured practice and feedback when
            you are ready.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 screen744:grid-cols-3 screen744:gap-8">
          {steps.map((step) => (
            <article
              key={step.number}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 screen744:p-8 hover:border-slate-300 hover:shadow-md"
            >
              <span
                className="pointer-events-none absolute right-4 top-2 text-6xl font-black leading-none opacity-[0.08] screen744:text-7xl"
                style={{ color: step.color }}
                aria-hidden
              >
                {step.number}
              </span>
              <div
                className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-extrabold"
                style={{
                  borderColor: step.color,
                  backgroundColor: `${step.color}14`,
                  color: step.color,
                }}
              >
                {step.number}
              </div>
              <h3 className="relative text-lg font-bold text-slate-900 screen744:text-xl">
                {step.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-600 screen744:text-base">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center screen744:mt-14">
          <Link
            href="/practice-overview"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#1B2B5A] to-[#2E4494] px-8 py-3.5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(27,43,90,0.3)] transition-shadow hover:shadow-[0_6px_20px_rgba(27,43,90,0.35)]"
            onClick={() =>
              trackCTA("Start Your Free Practice", "home_how_it_works_redesign")
            }
          >
            Start Your Free Practice
            <ArrowForwardIcon sx={{ fontSize: 22 }} aria-hidden />
          </Link>
          <JoinedTodayMicrocopy />
        </div>
      </div>
    </section>
  );
}
