"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import ExamSectionCard from "./ExamSectionCard";
import { useButtonVisibleStore } from "@/store/buttonVisible.store";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/v2/Button";
import { SvgLearning } from "@/components/icons";
import SvgWord from "@/components/icons/Word";
import { cn } from "@/lib/utils";
import { useHomepageCta } from "@/hooks/useHomepageCta";
import { useRecentVisitsLiveStat } from "@/hooks/useRecentSignupsLiveStat";
import { PricingUpgradeModalHeaderList } from "@/components/pages/pricing/PricingUpgradeModalHeaderList";
import SvgPlus from "../../icons/Plus";
import SvgArrowRight from "../../icons/ArrowRight";

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

const heroExamSections = [
  {
    title: "Listening",
    icon: <SvgListening className="text-maple-dark" />,
    bgColor: "bg-primary5",
    link: "/listening",
  },
  {
    title: "Speaking",
    icon: <SvgSpeaking className="text-error2" />,
    bgColor: "bg-secondary5",
    link: "/speaking",
  },
  {
    title: "Writing",
    icon: <SvgWriting className="text-success" />,
    bgColor: "bg-success5",
    link: "/writing",
  },
  {
    title: "Reading",
    icon: <SvgReading className="text-error1" />,
    bgColor: "bg-error5",
    link: "/reading",
  },
  {
    title: "Learning",
    icon: <SvgLearning className="text-secondary2" />,
    bgColor: "bg-secondary6",
    link: "/learning",
  },
  {
    title: "Words",
    icon: <SvgWord className="w-[24px] text-success" />,
    bgColor: "bg-success_light",
    link: "/words",
  },
  {
    title: "+60 mock exams",
    icon: <SvgMockExamsColorful />,
    bgColor: "bg-purple5",
    link: "/exam-overview",
  },
] as const;

const AVATAR_SRCS = [1, 2, 3, 4, 5].map(
  (i) => `https://i.pravatar.cc/128?u=celpip-hero-${i}`,
);

const HERO_CTA_CLASS =
  "w-full px-6 screen744:w-auto screen744:min-w-[260px] screen744:px-8";

const Hero = () => {
  const { ref } = useInView();
  const { setVisible, isVisible, isInFooter } = useButtonVisibleStore(
    (state) => state,
  );
  const { href, label, shortLabel, trackClick } = useHomepageCta();
  const { count: visitsCount, display: visitsDisplay } = useRecentVisitsLiveStat("");

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
            <span className="hidden screen744:flex">{label}</span>
            <span className="flex screen744:hidden">{shortLabel}</span>
          </Button>
        </div>
      </div>

      <section className="relative overflow-hidden">
        <div className="relative z-[1] mx-auto w-full max-w-[1200px] px-4 pb-10 screen744:px-8 screen744:pb-14">
          <div className="grid grid-cols-1 items-center gap-10 screen1024:grid-cols-2 screen1024:gap-8 screen1280:gap-10">
            <div className="flex w-full flex-col items-center text-center screen744:items-stretch screen744:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                <VerifiedIcon sx={{ fontSize: 16, color: "#316BFF" }} />
                <span className="text-[0.813rem] font-semibold text-primary1">
                  #1 Rated CELPIP Prep Platform 2026
                </span>
              </div>

              <h1 className="mb-5 w-full text-balance text-[2.5rem] font-extrabold leading-[1.1] screen744:text-[3rem] screen1280:text-[3.75rem]">
                <span className="text-text1">Reach Your Target CELPIP Score.</span>{" "}
                <span className="text-secondary2">Faster.</span>
              </h1>

              <div className="mb-8 w-full max-w-[560px] screen1024:max-w-none">
                <PricingUpgradeModalHeaderList
                  visitsDisplay={visitsCount != null ? visitsDisplay : undefined}
                  className="mx-auto screen744:mx-0"
                  itemTextClassName="text-text2 screen744:text-base"
                  emphasisTextClassName="font-semibold text-text2 screen744:text-base"
                />
              </div>

              <div className="mb-4 flex w-full max-w-md screen744:max-w-none">
                <Button
                  size="lg"
                  variant="primary"
                  href={href}
                  className={HERO_CTA_CLASS}
                  onClick={() => trackClick("hero_main")}
                >
                  Start Free Practice
                  <SvgArrowRight className="h-5 w-5" />
                </Button>
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
                        sx={{ fontSize: 16, color: "#F4845F" }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-text2">
                    Loved by <strong className="text-text1">70,000+</strong> test-takers
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 screen744:gap-3 screen1280:gap-4">
              {heroExamSections.map((exam) => {
                const isFullRow = exam.link === "/exam-overview";
                return (
                  <ExamSectionCard
                    key={exam.title}
                    title={exam.title}
                    icon={exam.icon}
                    bgColor={exam.bgColor}
                    link={exam.link}
                    spanFullRow={isFullRow}
                    className="min-w-0 w-full screen744:flex-none screen744:!max-w-none screen1280:!max-w-none"
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;
