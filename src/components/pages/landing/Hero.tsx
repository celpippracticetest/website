"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import ExamSectionCard from "./ExamSectionCard";
import { useButtonVisibleStore } from "@/store/buttonVisible.store";
import { useInView } from "react-intersection-observer";
import TopHeader from "./TopHeader";
import { Button } from "@/components/v2/Button";
import { SvgLearning } from "@/components/icons";
import SvgWord from "@/components/icons/Word";
import { cn } from "@/lib/utils";
import { useHomepageCta } from "@/hooks/useHomepageCta";
import SvgPlus from "../../icons/Plus";
import SvgArrowRight from "../../icons/ArrowRight";
import SvgPlay from "../../icons/Play";

const SvgMockExamsColorful = dynamic(
  () => import("../../icons/MockExamsColorful"),
  { ssr: false },
);
const SvgListening = dynamic(() => import("../../icons/Listening"), {
  ssr: false,
});
const SvgSpeaking = dynamic(() => import("../../icons/Speaking"), {
  ssr: false,
});
const SvgWriting = dynamic(() => import("../../icons/Writing"), { ssr: false });
const SvgReading = dynamic(() => import("../../icons/Reading"), { ssr: false });

const stats = [
  { value: "60+", label: "Mock Exams" },
  { value: "3,000+", label: "Questions" },
  { value: "Instant", label: "AI Scoring" },
  { value: "70K+", label: "Test-Takers" },
];

const AVATAR_SRCS = [1, 2, 3, 4, 5].map(
  (i) => `https://i.pravatar.cc/128?u=celpip-hero-${i}`,
);

function HeroJoinedToday() {
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
        /* keep fallback */
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
    <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <p className="text-sm font-semibold text-emerald-700">
        {display} joined today
      </p>
    </div>
  );
}

const Hero = () => {
  const { ref } = useInView();
  const { setVisible, isVisible, isInFooter } = useButtonVisibleStore(
    (state) => state,
  );
  const { href, label, shortLabel, trackClick } = useHomepageCta();

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY > 100 && !isInFooter) setVisible(false);
      else if (scrollY > 100 && isInFooter) setVisible(false);
      else if (scrollY < 100) setVisible(false);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isInFooter, setVisible]);

  useEffect(() => {
    if (window.location.hash === "#plans") {
      const el = document.getElementById("plans");
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 300);
      }
    }
  }, []);

  return (
    <div ref={ref} className="flex flex-col">
      <div
        className={cn(
          "fixed bottom-0 left-1/2 z-[10] flex h-[112px] w-full -translate-x-1/2 items-center justify-center rounded-t-2xl border border-white/80 bg-white/90 shadow-[0_-12px_40px_-16px_rgba(15,23,42,0.2)] backdrop-blur-lg transition-all duration-500 ease-out",
          isVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <div onClick={() => trackClick("hero_floating_bottom")}>
          <Button size="lg" href={href} aria-label={label}>
            <SvgPlus />
            <span className="hidden sm:!flex">{label}</span>
            <span className="flex sm:!hidden">{shortLabel}</span>
          </Button>
        </div>
      </div>

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#FAFBFF_0%,#EEF2FF_50%,#FAFBFF_100%)]">
        <div
          className="pointer-events-none absolute -right-[200px] -top-[200px] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-[100px] -left-[100px] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.05)_0%,transparent_70%)]"
          aria-hidden
        />

        <TopHeader />

        <div className="relative z-[1] mx-auto w-full max-w-[1200px] px-4 pb-10 pt-[88px] screen744:px-8 screen744:pb-14 screen744:pt-[96px]">
          <div className="grid grid-cols-1 items-center gap-10 screen744:grid-cols-12 screen744:gap-8 screen1280:gap-12">
            {/* Left content */}
            <div className="screen744:col-span-7">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
                <VerifiedIcon sx={{ fontSize: 16, color: "#3B82F6" }} />
                <span className="text-[0.813rem] font-semibold text-blue-700">
                  #1 Rated CELPIP Prep Platform 2026
                </span>
              </div>

              <h1 className="mb-5 text-balance text-[2.5rem] font-extrabold leading-[1.1] text-primary2 screen744:text-[3rem] screen1280:text-[3.75rem]">
                Reach Your Target{" "}
                <span className="bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
                  CELPIP Score
                </span>
                .{" "}
                <span className="italic text-[#F59E0B]">Faster.</span>
              </h1>

              <p className="mb-8 max-w-[560px] text-base leading-[1.7] text-text2 screen744:text-[1.2rem]">
                Full-length mock exams, instant AI scoring, and expert feedback
                — everything you need to pass CELPIP on your first attempt. Join
                70,000+ successful test-takers.
              </p>

              <div className="mb-4 flex flex-col gap-3 screen744:flex-row screen744:gap-4">
                <Link
                  href={href}
                  onClick={() => trackClick("hero_main")}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#1B2B5A] to-[#2E4494] px-8 py-3.5 text-[1.1rem] font-medium text-white shadow-[0_4px_14px_rgba(27,43,90,0.3)] transition-shadow hover:shadow-[0_6px_20px_rgba(27,43,90,0.4)]"
                >
                  Start Free Practice
                  <SvgArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/exam-overview"
                  onClick={() => trackClick("hero_mock_exam")}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] px-6 py-3.5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)]"
                >
                  <SvgPlay className="h-5 w-5 shrink-0 text-white" />
                  Try a Mock Exam
                </Link>
              </div>

              <p className="mb-8 text-sm text-text2">
                No credit card required • Free forever plan • Upgrade anytime
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex -space-x-2">
                  {AVATAR_SRCS.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt="Student"
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarIcon
                        key={i}
                        sx={{ fontSize: 16, color: "#F59E0B" }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-text2">
                    Loved by <strong>70,000+</strong> test-takers
                  </p>
                </div>
              </div>
            </div>

            {/* Right — score preview card */}
            <div className="flex justify-center screen744:col-span-5 screen744:justify-end">
              <div className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm screen744:p-8">
                <div className="mb-6 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text3">
                    Your CELPIP Score Preview
                  </p>
                  <div className="mx-auto mt-4 flex h-[120px] w-[120px] items-center justify-center rounded-full border border-stone-200/90 bg-gradient-to-br from-[#EDE8E3] via-[#F4EFE9] to-[#FAF7F4] shadow-[0_6px_24px_rgba(120,113,108,0.08)]">
                    <div className="text-center">
                      <p className="text-4xl font-extrabold leading-none text-stone-700">
                        9+
                      </p>
                      <p className="text-xs font-medium text-stone-500">CLB Level</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl bg-[#F4F7FF] p-3 text-center"
                    >
                      <p className="text-xl font-extrabold text-primary2">
                        {stat.value}
                      </p>
                      <p className="text-xs text-text2">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <HeroJoinedToday />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation cards */}
        <div className="relative z-[1] flex w-full flex-col overflow-hidden border-t border-slate-200/60">
          <div className="mx-auto flex w-full max-w-[1440px] flex-row flex-wrap gap-3 px-4 pb-12 pt-6 screen744:flex-nowrap screen744:gap-4 screen744:px-10 screen744:pb-10 screen1280:gap-6">
            {[
              {
                title: "Listening",
                icon: <SvgListening className="text-[#1D4ED8]" />,
                bgColor: "bg-primary5",
                link: "/listening",
              },
              {
                title: "Speaking",
                icon: <SvgSpeaking className="text-[#BE123C]" />,
                bgColor: "bg-secondary5",
                link: "/speaking",
              },
              {
                title: "Writing",
                icon: <SvgWriting className="text-[#0D9488]" />,
                bgColor: "bg-success5",
                link: "/writing",
              },
              {
                title: "Reading",
                icon: <SvgReading className="text-[#B91C1C]" />,
                bgColor: "bg-error5",
                link: "/reading",
              },
              {
                title: "Mock Exams",
                icon: <SvgMockExamsColorful />,
                bgColor: "bg-purple5",
                link: "/exam-overview",
              },
              {
                title: "Learning",
                icon: <SvgLearning className="text-[#854D0E]" />,
                bgColor: "bg-[#FEF9C3]",
                link: "/learning",
              },
              {
                title: "Words",
                icon: <SvgWord className="w-[24px] text-[#0D8A72]" />,
                bgColor: "bg-[#CCFBF1]",
                link: "/words",
              },
            ].map((exam, index, array) => {
              const isLast = index === array.length - 1;
              return (
                <ExamSectionCard
                  key={exam.title}
                  title={exam.title}
                  icon={exam.icon}
                  bgColor={exam.bgColor}
                  isLast={isLast}
                  link={exam.link}
                  className={cn("screen744:!w-auto", {
                    "!w-[calc(50%-6px)]": !isLast,
                    "w-full": isLast,
                  })}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;
