"use client";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useRecentSignupsLiveStat } from "@/hooks/useRecentSignupsLiveStat";
import { Button } from "@/components/v2/Button";
import { useEventTracker } from "@/hooks/useTracking";

const steps = [
  {
    number: "01",
    title: "Pick a Skill or Full Mock",
    description:
      "Jump into Listening, Reading, Writing, or Speaking — or run a timed mock that mirrors the real CELPIP flow.",
    ghostClass: "text-primary1",
    badgeClass: "text-primary1 border-primary1 bg-primary5",
  },
  {
    number: "02",
    title: "Practice with Instant Scoring",
    description:
      "Submit responses and get fast AI feedback on open-ended tasks, plus auto-scored MCQs with detailed explanations.",
    ghostClass: "text-purple",
    badgeClass: "text-purple border-purple bg-purple5",
  },
  {
    number: "03",
    title: "Review, Compare, Repeat",
    description:
      "Read explanations, compare to sample answers, and track progress so each session targets your weakest spots.",
    ghostClass: "text-secondary2",
    badgeClass: "text-secondary2 border-secondary2 bg-secondary6",
  },
] as const;

function JoinedTodayMicrocopy() {
  const { display } = useRecentSignupsLiveStat("3,358");
  return (
    <p className="mt-3 text-sm text-text3">
      Join {display} people who started today
    </p>
  );
}

export function HomeHowItWorksSection() {
  const { trackCTA } = useEventTracker();

  return (
    <section
      aria-labelledby="how-redesign-heading"
      className="border-t border-outline/60 py-14 screen744:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-4 screen744:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center screen744:mb-14">
          <span className="mb-3 inline-block rounded-full bg-secondary6 px-3 py-1 text-xs font-semibold text-secondary2">
            Simple Process
          </span>
          <h2
            id="how-redesign-heading"
            className="text-balance text-3xl font-extrabold text-text1 screen744:text-4xl"
          >
            Start Improving in{" "}
            <span className="text-secondary2">3 Minutes</span>
          </h2>
          <p className="mt-3 text-base text-text2 screen744:text-lg">
            No appointments, no setup. Just structured practice and feedback when
            you are ready.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 screen744:grid-cols-3 screen744:gap-8">
          {steps.map((step) => (
            <article
              key={step.number}
              className="relative overflow-hidden rounded-2xl border border-outline bg-white p-6 shadow-sm transition-all duration-300 screen744:p-8 hover:border-primary5 hover:shadow-md"
            >
              <span
                className={`pointer-events-none absolute right-4 top-2 text-6xl font-black leading-none opacity-[0.08] screen744:text-7xl ${step.ghostClass}`}
                aria-hidden
              >
                {step.number}
              </span>
              <div
                className={`relative mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-extrabold ${step.badgeClass}`}
              >
                {step.number}
              </div>
              <h3 className="relative text-lg font-bold text-text1 screen744:text-xl">
                {step.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-text2 screen744:text-base">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center screen744:mt-14">
          <Button
            size="lg"
            variant="primary"
            href="/practice-overview"
            onClick={() =>
              trackCTA("Start Your Free Practice", "home_how_it_works_redesign")
            }
          >
            Start Your Free Practice
            <ArrowForwardIcon sx={{ fontSize: 22 }} aria-hidden />
          </Button>
          <JoinedTodayMicrocopy />
        </div>
      </div>
    </section>
  );
}
