"use client";

import Image from "next/image";
import Link from "next/link";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Timer from "@mui/icons-material/Timer";
import TouchApp from "@mui/icons-material/TouchApp";
import School from "@mui/icons-material/School";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { useHomepageCta } from "@/hooks/useHomepageCta";

const professionAccent = {
  blue: { badge: "bg-blue-50 text-blue-700", btn: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20", ring: "ring-blue-500/20" },
  teal: { badge: "bg-teal-50 text-teal-700", btn: "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20", ring: "ring-teal-500/20" },
  amber: { badge: "bg-amber-50 text-amber-700", btn: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20", ring: "ring-amber-500/20" },
  emerald: { badge: "bg-emerald-50 text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20", ring: "ring-emerald-500/20" },
  rose: { badge: "bg-rose-50 text-rose-700", btn: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20", ring: "ring-rose-500/20" },
  cyan: { badge: "bg-cyan-50 text-cyan-700", btn: "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20", ring: "ring-cyan-500/20" },
  indigo: { badge: "bg-indigo-50 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20", ring: "ring-indigo-500/20" },
  violet: { badge: "bg-violet-50 text-violet-700", btn: "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20", ring: "ring-violet-500/20" },
  slate: { badge: "bg-slate-100 text-slate-700", btn: "bg-slate-600 hover:bg-slate-700 shadow-slate-600/20", ring: "ring-slate-500/20" },
} as const;

export type ExamModeFeatureAccent = keyof typeof professionAccent;

export type ExamModeFeatureSectionProps =
  | { variant: "landing"; ctaHref: string; ctaLabel: string; onCtaClick?: () => void }
  | { variant: "profession"; accent: ExamModeFeatureAccent };

const bullets = [
  {
    icon: TouchApp,
    title: "One toggle, two experiences",
    body: "Switch between Practice Mode and Exam Mode at the top of any full mock exam—stay casual or go formal when you are ready.",
  },
  {
    icon: Timer,
    title: "Timers and real exam flow",
    body: "Exam Mode uses timed parts, clear section headers, and navigation that mirrors what you will see on test day.",
  },
  {
    icon: School,
    title: "Instructions and audio like the real test",
    body: "Read official-style overviews, hear audio once where it matters, and answer under the same constraints as the live CELPIP.",
  },
] as const;

export function ExamModeFeatureSection(props: ExamModeFeatureSectionProps) {
  const isLanding = props.variant === "landing";
  const accent = isLanding ? null : professionAccent[props.accent];

  const inner = (
    <>
      <div className={isLanding ? "text-center max-w-3xl mx-auto mb-10 md:mb-12" : "text-center max-w-3xl mx-auto mb-10 md:mb-12"}>
        {accent ? (
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium mb-4 ${accent.badge}`}>
            Mock exams
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-[#3d4f7c] border border-[#d6e0ff] mb-4 shadow-sm">
            Mock exams
          </span>
        )}
        <h2 id="exam-mode-feature-heading" className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-4">
          Official Exam Mode in every full mock test
        </h2>
        <p className="text-base md:text-lg text-slate-600 leading-relaxed">
          Train under real conditions when you want to. Exam Mode hides the training-wheel feel so you can rehearse pacing, focus, and timing—the same layout and flow you will rely on at the center.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 mb-10 md:mb-12">
        <figure
          className={`relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ${
            accent ? `ring-1 ${accent.ring}` : "ring-1 ring-slate-900/5"
          }`}
        >
          <div className="relative aspect-[16/10] w-full bg-slate-50">
            <Image
              src="/images/exam-mode1.png"
              alt="CELPIP mock exam interface showing Practice Mode and Exam Mode toggle with Listening Test overview instructions"
              fill
              className="object-contain object-top p-2 sm:p-3"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={isLanding}
            />
          </div>
          <figcaption className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600 text-center">
            Exam Mode selected—official-style overview before the section begins
          </figcaption>
        </figure>
        <figure
          className={`relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ${
            accent ? `ring-1 ${accent.ring}` : "ring-1 ring-slate-900/5"
          }`}
        >
          <div className="relative aspect-[16/10] w-full bg-slate-50">
            <Image
              src="/images/exam-mode2.png"
              alt="CELPIP mock listening test in Exam Mode with timer, audio playing once, and multiple-choice questions"
              fill
              className="object-contain object-top p-2 sm:p-3"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <figcaption className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600 text-center">
            Timed parts, progress, and questions in a focused exam layout
          </figcaption>
        </figure>
      </div>

      <ul className="grid gap-4 md:grid-cols-3 md:gap-6 mb-10">
        {bullets.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-5 shadow-sm"
          >
            <div className="flex flex-row items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 font-semibold text-slate-900 leading-snug pt-0.5">
                {title}
              </span>
            </div>
            <span className="text-sm text-slate-600 leading-relaxed">{body}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row flex-nowrap items-center justify-center gap-3 sm:gap-4 min-w-0">
        {isLanding ? (
          <>
            <Link
              href={props.ctaHref}
              onClick={props.onCtaClick}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#4a6cf7] px-5 text-sm font-medium text-white shadow-md transition hover:bg-[#3d5ce6] sm:px-8 sm:text-base"
            >
              {props.ctaLabel}
              <ArrowForward className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
            <span className="whitespace-nowrap text-xs text-slate-500 sm:text-sm">
              No credit card required
            </span>
          </>
        ) : (
          <Link href="/exam-overview">
            <Button size="lg" className={`h-12 px-8 rounded-full shadow-lg ${accent?.btn}`}>
              Try a mock exam in Exam Mode
              <ArrowForward className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        )}
      </div>
    </>
  );

  if (isLanding) {
    return (
      <section
        id="exam-mode"
        className="mt-16 screen744:!mt-24 screen1280:!mt-28 scroll-mt-24"
        aria-labelledby="exam-mode-feature-heading">
        <div className="mx-auto max-w-[1440px] px-4 screen1280:!px-10">
          <div className="mx-auto max-w-[1160px] rounded-[32px] border border-[#dce6ff] bg-gradient-to-b from-white to-[#eef3ff] px-5 py-10 md:px-10 md:py-14 shadow-sm">
            {inner}
          </div>
        </div>
      </section>
    );
  }

  return (
    <Box className="mb-20" component="section" aria-labelledby="exam-mode-feature-heading">
      {inner}
    </Box>
  );
}

/** Homepage wrapper: wires A/B CTA + analytics without calling the hook on profession pages. */
export function ExamModeFeatureSectionLanding() {
  const { href, label, trackClick } = useHomepageCta();
  return (
    <ExamModeFeatureSection
      variant="landing"
      ctaHref={href}
      ctaLabel={label}
      onCtaClick={() => trackClick("exam_mode_section")}
    />
  );
}
