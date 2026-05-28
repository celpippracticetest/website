"use client";

import Link from "next/link";
import TimerIcon from "@mui/icons-material/Timer";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useEventTracker } from "@/hooks/useTracking";

const features = [
  {
    Icon: TimerIcon,
    title: "Mock Exams That Feel Like Test Day",
    description:
      "Full-length, timed exams across all four skills. Pacing and layout mirror the real CELPIP so nothing surprises you on exam day.",
    cta: "Try a Mock Exam",
    href: "/exam-overview",
    iconClass: "text-primary1",
    bgClass: "bg-primary6",
    popular: false,
  },
  {
    Icon: AutoAwesomeIcon,
    title: "AI Scoring & CLB-Style Feedback",
    description:
      "Writing and Speaking get instant, structured feedback. Know exactly what to fix on your next attempt — not days later.",
    cta: "Try AI Feedback",
    href: "/writing",
    iconClass: "text-purple",
    bgClass: "bg-purple5",
    popular: true,
  },
  {
    Icon: MenuBookIcon,
    title: "Explanations & Sample Answers",
    description:
      "See why each Listening and Reading option is right or wrong. Compare your work to levelled examples and learn faster.",
    cta: "Browse Practice",
    href: "/reading",
    iconClass: "text-success",
    bgClass: "bg-success5",
    popular: false,
  },
  {
    Icon: TrendingUpIcon,
    title: "Track Progress & Target Weaknesses",
    description:
      "Dashboard shows your score trends, time per question, and skill gaps. Every session builds on the last one.",
    cta: "View Dashboard",
    href: "/practice-overview",
    iconClass: "text-secondary2",
    bgClass: "bg-secondary6",
    popular: false,
  },
] as const;

export function HomeFeaturesSection() {
  const { trackCTA } = useEventTracker();

  return (
    <section
      aria-labelledby="features-heading"
      className="relative overflow-hidden py-14 screen744:py-20"
    >
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 screen744:px-8">
        <div className="mx-auto mb-10 max-w-[700px] text-center screen744:mb-14">
          <span className="mb-3 inline-block rounded-full bg-primary6 px-3 py-1 text-xs font-semibold text-primary1">
            Everything You Need
          </span>
          <h2
            id="features-heading"
            className="text-balance text-3xl font-extrabold text-text1 screen744:text-4xl"
          >
            One Platform. All Four Skills.{" "}
            <span className="text-primary1">Real Results.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 screen744:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.Icon;
            return (
              <article
                key={feature.title}
                className="group relative overflow-visible rounded-2xl border border-outline/90 bg-white p-6 shadow-sm transition-all duration-300 screen744:p-8 hover:-translate-y-1 hover:border-primary5 hover:shadow-[0_12px_40px_rgba(33,46,66,0.08)]"
              >
                {feature.popular ? (
                  <span className="absolute -top-3 right-4 rounded-full bg-purple px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                    Most Popular
                  </span>
                ) : null}
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${feature.bgClass} ${feature.iconClass}`}
                >
                  <Icon sx={{ fontSize: 28 }} aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-text1 screen744:text-xl">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text2 screen744:text-base">
                  {feature.description}
                </p>
                <Link
                  href={feature.href}
                  className={`mt-5 inline-flex items-center gap-1 text-sm font-semibold transition-all group-hover:translate-x-1 screen744:text-base ${feature.iconClass}`}
                  onClick={() => trackCTA(feature.cta, "home_features")}
                >
                  {feature.cta}
                  <ArrowForwardIcon sx={{ fontSize: 18 }} aria-hidden />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
