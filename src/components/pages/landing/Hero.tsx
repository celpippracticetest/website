"use client";

import React, { useEffect } from "react";
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
import { useRecentSignupsLiveStat } from "@/hooks/useRecentSignupsLiveStat";
import { PricingUpgradeModalHeaderList } from "@/components/pages/pricing/PricingUpgradeModalHeaderList";
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

const heroExamSections = [
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
] as const;

const AVATAR_SRCS = [1, 2, 3, 4, 5].map(
  (i) => `https://i.pravatar.cc/128?u=celpip-hero-${i}`,
);

function HeroJoinedToday({ display }: { display: string }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#F4F7FF] px-4 py-3">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <p className="text-sm font-semibold text-primary2">
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
  const { display: signupDisplay } = useRecentSignupsLiveStat("3,358");

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

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.06)_0%,transparent_35%),radial-gradient(circle_at_0%_100%,rgba(245,158,11,0.05)_0%,transparent_35%),linear-gradient(180deg,#FAFBFF_0%,#EEF2FF_50%,#FAFBFF_100%)]">
        <TopHeader />

        <div className="relative z-[1] mx-auto w-full max-w-[1200px] px-4 pb-10 pt-[88px] screen744:px-8 screen744:pb-14 screen744:pt-[96px]">
          <div className="grid grid-cols-1 items-center gap-10 screen744:grid-cols-12 screen744:gap-8 screen1280:gap-12">
            {/* Left content */}
            <div className="flex flex-col items-center text-center screen744:col-span-7 screen744:items-stretch screen744:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
                <VerifiedIcon sx={{ fontSize: 16, color: "#3B82F6" }} />
                <span className="text-[0.813rem] font-semibold text-blue-700">
                  #1 Rated CELPIP Prep Platform 2026
                </span>
              </div>

              <h1 className="mb-5 text-balance text-[2.5rem] font-extrabold leading-[1.1] screen744:text-[3rem] screen1280:text-[3.75rem]">
                <span className="text-[#2563EB]">Reach Your Target CELPIP Score.</span>{" "}
                <span className="text-[#F59E0B]">Faster.</span>
              </h1>

              <div className="mb-8 w-full max-w-[560px]">
                <PricingUpgradeModalHeaderList
                  signupDisplay={signupDisplay}
                  className="mx-auto screen744:mx-0"
                  itemTextClassName="text-text2 screen744:text-base"
                  emphasisTextClassName="font-semibold text-text2 screen744:text-base"
                />
              </div>

              <div className="mb-4 flex w-full max-w-md flex-col gap-3 screen744:max-w-none screen744:flex-row screen744:gap-4">
                <Link
                  href={href}
                  onClick={() => trackClick("hero_main")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563EB] px-8 py-3.5 text-[1.1rem] font-medium text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#1D4ED8] screen744:w-auto"
                >
                  Start Free Practice
                  <SvgArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/exam-overview"
                  onClick={() => trackClick("hero_mock_exam")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F59E0B] px-6 py-3.5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(245,158,11,0.35)] transition-colors hover:bg-[#D97706] screen744:w-auto"
                >
                  <SvgPlay className="h-5 w-5 shrink-0 text-white" />
                  Try a Mock Exam
                </Link>
              </div>

              <p className="mb-8 text-sm text-text2">No credit card required</p>


              <div className="flex flex-wrap items-center justify-center gap-4 screen744:justify-start">
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

                <HeroJoinedToday display={signupDisplay} />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-[1] mx-auto mt-8 w-full max-w-[1440px] px-4 screen744:mt-10 screen744:px-10 screen1280:px-10">
          <div className="flex w-full flex-row flex-wrap justify-center gap-3 screen744:flex-nowrap screen744:gap-3 screen1280:gap-4">
            {heroExamSections.map((exam, index, array) => {
              const isLastMobile = index === array.length - 1;
              return (
                <ExamSectionCard
                  key={exam.title}
                  title={exam.title}
                  icon={exam.icon}
                  bgColor={exam.bgColor}
                  isLast={false}
                  link={exam.link}
                  className={cn(
                    "min-w-0 screen744:flex-1 screen744:!max-w-none screen1280:!max-w-none",
                    {
                      "max-[743px]:!w-[calc(50%-6px)]": !isLastMobile,
                      "max-[743px]:w-full": isLastMobile,
                    }
                  )}
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
