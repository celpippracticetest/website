"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "framer-motion";
import { useButtonVisibleStore } from "@/store/buttonVisible.store";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/v2/Button";
import SvgMedalLg from "@/components/v2/icons/medal-lg";
import SvgMedalMd from "@/components/v2/icons/medal-md";
import { cn } from "@/lib/utils";
import { useHomepageCta } from "@/hooks/useHomepageCta";
import { PrepEcosystemCard } from "./PrepEcosystemCard";
import { prepEcosystemItems } from "./prepEcosystemItems";

const SvgMockExamLight = dynamic(() => import("../../icons/MockExamsLight"), {
  ssr: false,
});
const SvgSampleTest = dynamic(() => import("../../icons/SampleTest"), {
  ssr: false,
});
const SvgGuide = dynamic(() => import("../../icons/Guide"), { ssr: false });
const SvgScoring = dynamic(() => import("../../icons/Scoring"), { ssr: false });
const SvgPlus = dynamic(() => import("../../icons/Plus"), { ssr: false });

type HeroRedesignProps = {
  heroImage: {
    imageUrl: string;
    altText: string;
  };
  withMarketingHeader?: boolean;
};

const statTiles = [
  {
    title1: "60",
    title2: "mock exams",
    iconKey: "mock" as const,
  },
  {
    title1: "",
    title2: "Guide & Tips",
    iconKey: "guide" as const,
  },
  {
    title1: "3,000+",
    title2: "sample tests",
    iconKey: "sample" as const,
  },
  {
    title1: "",
    title2: "AI scoring",
    iconKey: "score" as const,
  },
];

/**
 * Style 1 (`classic` / `?s=1`): Redesign of legacy messaging — calm `#F4F7FF` shell, card-based
 * stats, framed hero visual, and {@link PrepEcosystemCard} grid (not legacy ExamSectionCard).
 */
const HeroRedesign = ({
  heroImage,
  withMarketingHeader = false,
}: HeroRedesignProps) => {
  const { ref } = useInView();
  const { setVisible, isVisible, isInFooter } = useButtonVisibleStore(
    (state) => state,
  );
  const { href, label, shortLabel, trackClick } = useHomepageCta();

  const handleCTAClick = (location: string) => {
    trackClick(location);
  };

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

  const statIcon = (key: (typeof statTiles)[number]["iconKey"]) => {
    switch (key) {
      case "mock":
        return <SvgMockExamLight />;
      case "guide":
        return <SvgGuide />;
      case "sample":
        return <SvgSampleTest />;
      case "score":
        return <SvgScoring />;
    }
  };

  return (
    <div ref={ref} className="flex flex-col bg-[#F4F7FF]">
      <div
        className={cn(
          "w-full flex justify-center fixed z-[10] h-[112px] items-center left-1/2 -translate-x-1/2 transition-all duration-500 ease-out bottom-0 rounded-t-2xl border border-white/80 bg-white/90 backdrop-blur-lg shadow-[0_-12px_40px_-16px_rgba(15,23,42,0.2)]",
          isVisible
            ? "opacity-100 translate-y-0"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <div onClick={() => handleCTAClick("hero_floating_bottom")}>
          <Button size="lg" href={href} aria-label={label}>
            <SvgPlus />
            <span className="hidden sm:!flex">{label}</span>
            <span className="flex sm:!hidden">{shortLabel}</span>
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-primary5/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-40 h-64 w-64 rounded-full bg-secondary2/15 blur-3xl"
          aria-hidden
        />

        <section
          className={cn(
            "relative z-[1] mx-auto w-full max-w-[1200px] px-4 pb-16 screen744:px-8 screen1280:pb-24",
            withMarketingHeader
              ? "pt-8 screen744:pt-12 screen1280:pt-14"
              : "pt-14 screen744:pt-20",
          )}
        >
          <div className="grid grid-cols-1 items-center gap-12 screen1280:grid-cols-2 screen1280:gap-16">
            <div className="order-2 flex flex-col screen1280:order-1">
              <div className="inline-flex w-fit max-w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-sm">
                <SvgMedalLg className="hidden h-10 w-10 shrink-0 screen1280:block" />
                <SvgMedalMd className="block h-9 w-9 shrink-0 screen1280:hidden" />
                <p className="text-left text-sm leading-snug text-text2 screen744:text-base">
                  <span className="font-extrabold text-primary2">#1 Top rated</span>{" "}
                  CELPIP prep · 2026
                </p>
              </div>

              <h1 className="mt-8 text-balance text-center text-[2rem] font-extrabold leading-[1.12] tracking-tight text-text1 screen744:text-[2.5rem] screen1280:text-left screen1280:text-[3.25rem] screen1280:leading-[1.08]">
                Reach your target{" "}
                <span className="text-primary2">CELPIP</span> score{" "}
                <span className="text-secondary2 italic">faster.</span>
              </h1>

              <p className="mt-4 text-center text-base text-text2 screen1280:text-left screen1280:text-lg">
                Full mock exams, thousands of questions, and instant AI feedback — in
                one place.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3 screen744:gap-4">
                {statTiles.map((item, index) => (
                  <motion.div
                    key={item.title2}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.25 }}
                    className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-2 text-text1">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary5/40">
                        {statIcon(item.iconKey)}
                      </span>
                      {item.title1 ? (
                        <span className="text-lg font-bold leading-none">
                          {item.title1}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium leading-snug text-text2">
                      {item.title2}
                    </p>
                  </motion.div>
                ))}
              </div>

              <p className="mt-6 text-center text-xs font-semibold text-text3 screen744:hidden">
                60 mock exams · 3,000+ questions · Instant AI scoring
              </p>

              <div className="mt-8 flex justify-center screen1280:justify-start">
                <div onClick={() => handleCTAClick("hero_main")}>
                  <Button href={href} size="lg" className="shadow-md">
                    <SvgPlus />
                    <span>{label}</span>
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex flex-row items-center justify-center gap-2 screen1280:justify-start">
                <Image
                  src="/images/people.png"
                  alt="People icon representing trust from thousands of learners"
                  width={65}
                  height={28}
                  className="max-h-[25px]"
                  priority
                />
                <p className="text-xs font-medium text-text1 screen1280:text-sm">
                  Trusted by 70k+ test-takers
                </p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="hidden w-full screen1280:order-2 screen1280:block"
            >
              <div className="relative mx-auto max-w-[min(100%,380px)] rounded-[28px] bg-gradient-to-br from-primary1/20 via-white to-secondary2/15 p-3 shadow-xl ring-1 ring-slate-200/70 screen1280:max-w-none">
                <div className="relative overflow-hidden rounded-2xl bg-white/60">
                  <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.altText}
                    width={400}
                    height={600}
                    className="h-auto w-full object-contain"
                    priority
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      <section className="relative border-t border-slate-200/80 bg-gradient-to-b from-white/80 to-[#F4F7FF] py-14 screen1280:py-20">
        <div className="mx-auto max-w-[1200px] px-4 screen744:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text3">
              Practice hub
            </p>
            <h2 className="mt-2 text-2xl font-bold text-text1 screen744:text-3xl">
              Where do you want to start?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-text2 screen744:text-base">
              Jump into listening, speaking, writing, reading, mocks, lessons, or
              vocabulary — same paths as always, clearer layout.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 screen744:grid-cols-4 screen1280:grid-cols-7 screen744:gap-4">
            {prepEcosystemItems.map((item) => (
              <PrepEcosystemCard
                key={item.link}
                title={item.title}
                icon={item.icon}
                bgColor={item.bgColor}
                link={item.link}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroRedesign;
