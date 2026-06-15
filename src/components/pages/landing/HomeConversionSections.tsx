"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/v2/Button";
import { useEventTracker } from "@/hooks/useTracking";

const GOOGLE_REVIEWS_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL?.trim();

export function HomeStatsTrustStrip() {
  const { ref, inView } = useInView({ rootMargin: "0px 0px -40px 0px", triggerOnce: true });
  const { trackCTA } = useEventTracker();

  const stats = [
    { value: "70k+", label: "Test-takers" },
    { value: "60+", label: "Full mock exams" },
    { value: "3,000+", label: "Practice questions" },
    { value: "Instant", label: "AI scoring" },
  ];

  return (
    <section
      ref={ref}
      aria-label="Platform reach and trust"
      className="w-full flex justify-center px-[16px] screen744:!px-[40px] mt-[16px] screen744:!mt-[20px] relative z-[1]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[1160px] rounded-[24px] screen744:!rounded-[32px] border border-white/80 bg-white/90 shadow-[0_12px_40px_-12px_rgba(49,107,255,0.15)] backdrop-blur-sm px-[20px] py-[20px] screen1280:!px-[32px] screen1280:!py-[24px]">
        <div className="flex flex-col screen744:!flex-row screen744:!items-center screen744:!justify-between gap-[16px]">
          <div className="grid grid-cols-2 screen744:!grid-cols-4 gap-x-[12px] gap-y-[16px] screen744:!gap-[24px] flex-1">
            {stats.map((s) => (
              <div key={s.label} className="text-center screen744:!text-left">
                <div className="text-[20px] screen1280:!text-[24px] font-bold text-text1 leading-tight">{s.value}</div>
                <div className="text-[12px] screen1280:!text-[14px] text-text2 font-normal mt-[2px]">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="h-px screen744:!h-auto screen744:!w-px bg-outline screen744:!self-stretch shrink-0" aria-hidden />
          <div className="flex flex-col items-center screen744:!items-end gap-[8px] text-center screen744:!text-right min-w-0 screen744:!max-w-[240px]">
            <div className="flex items-center gap-[6px] text-text1">
              <span className="text-secondary2 text-[18px] leading-none" aria-hidden>
                ★★★★★
              </span>
              <span className="text-[14px] screen1280:!text-[15px] font-semibold">Loved by learners</span>
            </div>
            {GOOGLE_REVIEWS_URL ? (
              <a
                href={GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] screen1280:!text-[14px] font-medium text-primary1 hover:underline underline-offset-4"
                onClick={() => trackCTA("Google reviews", "home_trust_strip")}>
                Read reviews on Google
              </a>
            ) : (
              <p className="text-[12px] screen1280:!text-[13px] text-text2 leading-snug">
                Built for IRCC, PNPs, citizenship, and licensing prep.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

const pillars = [
  {
    title: "Mock exams that feel like test day",
    body: "Full-length, timed exams across all four skills so pacing and layout feel familiar when it counts.",
    href: "/exam-overview",
    cta: "Try mock exams",
  },
  {
    title: "AI scoring & CLB-style feedback",
    body: "Writing and Speaking get instant, structured feedback so you know what to fix on the next attempt, not days later.",
    href: "/writing",
    cta: "Try AI feedback",
  },
  {
    title: "Explanations & sample answers",
    body: "See why each Listening and Reading option is right or wrong, and compare your work to levelled examples.",
    href: "/reading",
    cta: "Browse practice",
  },
];

const highIntentResources = [
  {
    title: "Free CELPIP Practice Test",
    body: "Start with a free online CELPIP practice test covering the four exam skills.",
    href: "/free-celpip-practice-test",
  },
  {
    title: "Writing Task 1 Samples",
    body: "Review CELPIP email samples with structure, tone, and scoring guidance.",
    href: "/celpip-writing-task-1-samples",
  },
  {
    title: "Writing Task 2 Samples",
    body: "Study survey-response samples and learn how higher-level answers are built.",
    href: "/celpip-writing-task-2-samples",
  },
  {
    title: "Speaking Samples",
    body: "See CELPIP speaking sample answers for common prompt types.",
    href: "/celpip-speaking-samples",
  },
];

export function HomeHighIntentResources() {
  const { ref, inView } = useInView({ rootMargin: "0px 0px -60px 0px", triggerOnce: true });
  const { trackCTA } = useEventTracker();

  return (
    <section
      ref={ref}
      aria-labelledby="resources-heading"
      className="max-w-[1440px] mx-auto px-[16px] screen744:!px-[40px] mt-[48px] screen1280:!mt-[72px]">
      <div className="max-w-[1160px] mx-auto">
        <div className="mb-[24px] flex flex-col gap-[8px] screen744:!flex-row screen744:!items-end screen744:!justify-between">
          <div>
            <h2 id="resources-heading" className="text-[24px] screen744:!text-[32px] font-medium text-text1">
              Popular CELPIP practice resources
            </h2>
            <p className="mt-[8px] max-w-[660px] text-[14px] screen1280:!text-[16px] leading-relaxed text-text2">
              Free tests, sample answers, and skill guides for the searches CELPIP learners make most.
            </p>
          </div>
          <Link
            href="/editorial-policy"
            className="text-[14px] font-semibold text-primary1 hover:underline underline-offset-4"
            onClick={() => trackCTA("Editorial policy", "home_resources")}>
            Editorial policy
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-[14px] screen744:!grid-cols-2 screen1280:!grid-cols-4">
          {highIntentResources.map((resource, index) => (
            <motion.article
              key={resource.href}
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.06, duration: 0.3 }}
              className="flex min-h-[180px] flex-col rounded-[18px] border border-[#E8EDFF] bg-white p-[20px] shadow-sm">
              <h3 className="text-[17px] font-semibold leading-snug text-text1">{resource.title}</h3>
              <p className="mt-[10px] flex-1 text-[14px] leading-relaxed text-text2">{resource.body}</p>
              <Link
                href={resource.href}
                className="mt-[18px] text-[14px] font-semibold text-primary1 hover:underline underline-offset-4"
                onClick={() => trackCTA(resource.title, "home_resources")}>
                Open resource <span aria-hidden>-&gt;</span>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeThreePillars() {
  const { ref, inView } = useInView({ rootMargin: "0px 0px -60px 0px", triggerOnce: true });
  const { trackCTA } = useEventTracker();

  return (
    <section
      ref={ref}
      aria-labelledby="pillars-heading"
      className="max-w-[1440px] mx-auto px-[16px] screen744:!px-[40px] mt-[48px] screen1280:!mt-[72px]">
        <div className="max-w-[1160px] mx-auto">
          <h2 id="pillars-heading" className="text-[24px] screen744:!text-[32px] font-medium text-text1 text-center mb-[8px]">
            Everything you need in one place
          </h2>
          <p className="text-center text-text2 text-[14px] screen1280:!text-[16px] max-w-[640px] mx-auto mb-[32px] screen1280:!mb-[40px]">
            Mock exams, instant AI scoring, and clear explanations, so you spend less time searching and more time improving.
          </p>
          <div className="grid grid-cols-1 screen744:!grid-cols-3 gap-[16px] screen1280:!gap-[24px]">
            {pillars.map((p, i) => (
              <motion.article
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.08, duration: 0.35 }}
                className="rounded-[24px] border border-[#E8EDFF] bg-white p-[24px] screen1280:!p-[28px] shadow-sm flex flex-col h-full">
                <h3 className="text-[18px] screen1280:!text-[20px] font-semibold text-text1 mb-[12px]">{p.title}</h3>
                <p className="text-[14px] text-text2 leading-relaxed flex-1 mb-[20px]">{p.body}</p>
                <Link
                  href={p.href}
                  className="text-[14px] font-semibold text-primary1 hover:underline underline-offset-4 inline-flex items-center gap-[4px] w-fit"
                  onClick={() => trackCTA(p.cta, "home_three_pillars")}>
                  {p.cta}
                  <span aria-hidden>-&gt;</span>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
  );
}

const steps = [
  {
    n: "01",
    title: "Pick a skill or a full mock",
    body: "Jump into Listening, Reading, Writing, or Speaking, or run a timed mock that mirrors the real CELPIP flow.",
  },
  {
    n: "02",
    title: "Practice with instant scoring",
    body: "Submit responses and get fast AI feedback on open-ended tasks, plus auto-scored MCQs with explanations.",
  },
  {
    n: "03",
    title: "Review, compare, repeat",
    body: "Read explanations, compare to sample answers, and track progress so each session targets your weakest spots.",
  },
];

export function HomeHowItWorks() {
  const { ref, inView } = useInView({ rootMargin: "0px 0px -60px 0px", triggerOnce: true });
  const { trackCTA } = useEventTracker();

  return (
    <section
      ref={ref}
      aria-labelledby="how-heading"
      className="max-w-[1440px] mx-auto px-[16px] screen744:!px-[40px] mt-[56px] screen1280:!mt-[80px]">
      <div className="max-w-[1160px] mx-auto rounded-[32px] screen1280:!rounded-[40px] bg-white border border-[#E8EDFF] px-[24px] py-[32px] screen1280:!px-[48px] screen1280:!py-[48px] shadow-[0_16px_48px_-20px_rgba(49,107,255,0.12)]">
        <h2 id="how-heading" className="text-[24px] screen744:!text-[32px] font-medium text-text1 text-center mb-[8px]">
          How online prep works
        </h2>
        <p className="text-center text-text2 text-[14px] screen1280:!text-[16px] max-w-[560px] mx-auto mb-[32px] screen1280:!mb-[40px]">
          Start in minutes. No appointments, just structured practice and feedback when you are ready.
        </p>
        <div className="flex flex-col screen744:!flex-row screen744:!gap-[20px] screen1280:!gap-[28px]">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.35 }}
              className="flex-1 flex flex-col items-center screen744:!items-start text-center screen744:!text-left">
              <span className="inline-flex items-center justify-center w-[48px] h-[48px] rounded-full bg-primary5 text-text1 font-bold text-[16px] mb-[16px]">
                {s.n}
              </span>
              <h3 className="text-[17px] screen1280:!text-[18px] font-semibold text-text1 mb-[8px]">{s.title}</h3>
              <p className="text-[14px] text-text2 leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-center mt-[32px] screen1280:!mt-[40px]">
          <Button size="lg" href="/practice-overview" onClick={() => trackCTA("Start Your Free Practice", "home_how_it_works")}>
            Start your free practice
          </Button>
        </div>
      </div>
    </section>
  );
}

export function HomeCelpipVsIeltsBand() {
  const { ref, inView } = useInView({ rootMargin: "0px 0px -40px 0px", triggerOnce: true });
  const { trackCTA } = useEventTracker();

  return (
    <section ref={ref} aria-labelledby="compare-heading" className="max-w-[1440px] mx-auto px-[16px] screen744:!px-[40px] mt-[48px] screen1280:!mt-[64px]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.35 }}
        className="max-w-[1160px] mx-auto rounded-[24px] screen1280:!rounded-[32px] bg-[linear-gradient(135deg,#1D4ED8_0%,#316BFF_45%,#0D9488_100%)] p-[1px]">
        <div className="rounded-[23px] screen1280:!rounded-[31px] bg-[#0f172a]/95 backdrop-blur-sm px-[24px] py-[28px] screen1280:!px-[40px] screen1280:!py-[32px] flex flex-col screen744:!flex-row screen744:!items-center screen744:!justify-between gap-[20px]">
          <div className="text-white min-w-0">
            <h2 id="compare-heading" className="text-[20px] screen1280:!text-[24px] font-semibold mb-[8px]">
              Choosing between CELPIP and IELTS?
            </h2>
            <p className="text-[14px] screen1280:!text-[15px] text-white/85 leading-relaxed max-w-[560px]">
              CELPIP is fully computer-based and Canada-focused. See how scores relate to CLB and IELTS bands, then pick the path that fits your timeline.
            </p>
          </div>
          <div className="flex flex-col screen744:!flex-row gap-[12px] shrink-0">
            <Button
              size="md"
              variant="outline"
              href="/wiki/celpip-reading-score-guide"
              className="!min-w-[200px]"
              onClick={() => trackCTA("CELPIP vs IELTS scores", "home_compare_band")}>
              Score comparison guide
            </Button>
            <Button
              size="md"
              variant="ghost"
              href="/learning"
              className="!min-w-[200px]"
              onClick={() => trackCTA("Free courses", "home_compare_band")}>
              Free learning hub
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
