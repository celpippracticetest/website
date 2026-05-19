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
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    popular: false,
  },
  {
    Icon: AutoAwesomeIcon,
    title: "AI Scoring & CLB-Style Feedback",
    description:
      "Writing and Speaking get instant, structured feedback. Know exactly what to fix on your next attempt — not days later.",
    cta: "Try AI Feedback",
    href: "/writing",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    popular: true,
  },
  {
    Icon: MenuBookIcon,
    title: "Explanations & Sample Answers",
    description:
      "See why each Listening and Reading option is right or wrong. Compare your work to levelled examples and learn faster.",
    cta: "Browse Practice",
    href: "/reading",
    color: "#10B981",
    bgColor: "#ECFDF5",
    popular: false,
  },
  {
    Icon: TrendingUpIcon,
    title: "Track Progress & Target Weaknesses",
    description:
      "Dashboard shows your score trends, time per question, and skill gaps. Every session builds on the last one.",
    cta: "View Dashboard",
    href: "/practice-overview",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    popular: false,
  },
] as const;

export function HomeFeaturesSection() {
  const { trackCTA } = useEventTracker();

  return (
    <section
      aria-labelledby="features-heading"
      className="bg-[#F4F7FF] py-14 screen744:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-4 screen744:px-8">
        <div className="mx-auto mb-10 max-w-[700px] text-center screen744:mb-14">
          <span className="mb-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
            Everything You Need
          </span>
          <h2
            id="features-heading"
            className="text-balance text-3xl font-extrabold text-slate-900 screen744:text-4xl"
          >
            One Platform. All Four Skills.{" "}
            <span className="text-[#2563EB]">Real Results.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 screen744:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.Icon;
            return (
            <article
              key={feature.title}
              className="group relative overflow-visible rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 screen744:p-8 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
            >
              {feature.popular ? (
                <span className="absolute -top-3 right-4 rounded-full bg-[#8B5CF6] px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                  Most Popular
                </span>
              ) : null}
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
                style={{ backgroundColor: feature.bgColor, color: feature.color }}
              >
                <Icon sx={{ fontSize: 28 }} aria-hidden />
              </div>
              <h3 className="text-lg font-bold text-slate-900 screen744:text-xl">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 screen744:text-base">
                {feature.description}
              </p>
              <Link
                href={feature.href}
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold transition-all group-hover:translate-x-1 screen744:text-base"
                style={{ color: feature.color }}
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
