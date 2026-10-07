"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useButtonVisibleStore } from "@/store/buttonVisible.store";
import TopHeader from "./TopHeader";
import RollingWords from "./RollingWords";
import { cn } from "@/lib/utils";
import { trackCTAClick } from "@/lib/analytics";
import { HOMEPAGE_HERO_STATS, HOMEPAGE_USER_COUNT } from "@/data/homepage-content";
import { playOnView } from "@/hooks/usePlayOnView";

// Icons for HOMEPAGE_HERO_STATS, matched by position.
const heroStatIcons = [
  <>
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M3 9h18M8 2v4M16 2v4" />
    <circle cx="12" cy="15" r="2.5" />
  </>,
  <>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M7 9l2 2 3-3M7 15l2 2 3-3M14 10h3M14 16h3" />
  </>,
  <>
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 4v4M9 13h.01M15 13h.01M9 17h6" />
  </>,
  <>
    <path d="M12 3l9 5-9 5-9-5z" />
    <path d="M7 10.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-5.5" />
  </>,
];

const heroFeatures = HOMEPAGE_HERO_STATS.map((stat, index) => ({
  label: !stat.value ? (
    <>{stat.label}</>
  ) : stat.valueFirst ? (
    <>
      <b className="font-bold">{stat.value}</b> {stat.label}
    </>
  ) : (
    <>
      {stat.label} <b className="font-bold">{stat.value}</b>
    </>
  ),
  icon: heroStatIcons[index],
}));

const Hero = () => {
  const isInFooter = useButtonVisibleStore((state) => state.isInFooter);
  const [pastHeroCta, setPastHeroCta] = useState(false);
  const [ctaBannerVisible, setCtaBannerVisible] = useState(false);
  // Mobile-only sticky CTA (per handoff): shows once the hero CTA has scrolled
  // away, and steps aside for the CTA banner and the footer.
  const showSticky = pastHeroCta && !ctaBannerVisible && !isInFooter;

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const watch = (id: string, onChange: (visible: boolean) => void) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), {
        rootMargin: "-68px 0px 0px 0px",
      });
      observer.observe(el);
      observers.push(observer);
    };
    watch("home-hero", (visible) => setPastHeroCta(!visible && window.scrollY > 0));
    watch("home-cta", setCtaBannerVisible);
    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  useEffect(() => {
    if (window.location.hash === "#plans") {
      const el = document.getElementById("plans");

      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, []);

  return (
    <div className="flex flex-col ">
      <div
        aria-hidden={!showSticky}
        className={cn(
          "screen744:!hidden fixed inset-x-0 bottom-0 z-[40] flex justify-center px-[20px] pt-[16px] pb-[calc(16px+env(safe-area-inset-bottom))]",
          "bg-[linear-gradient(180deg,rgba(244,247,255,0)_0%,rgba(244,247,255,0.92)_40%)]",
          "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          showSticky ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[16px] pointer-events-none",
        )}
      >
        <Link
          href="/writing"
          tabIndex={showSticky ? undefined : -1}
          onClick={() =>
            trackCTAClick("Start Your Free Practice", "hero_sticky", {
              itemId: "hero_sticky_cta",
            })
          }
          className={cn(
            "group/start flex w-full items-center justify-center gap-[8px] h-[54px] rounded-full",
            "bg-[#2554D6] text-white text-[17px] font-medium whitespace-nowrap shadow-[3.7px_3.9px_0_0_#759CFF]",
            "transition-[transform,background-color,box-shadow] duration-200",
            "hover:bg-[#1E46B8] data-[play]:bg-[#1E46B8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_#759CFF]",
            "motion-reduce:transition-none",
          )}
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/start:rotate-90 group-data-[play]/start:rotate-90"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <RollingWords text="Start Your Free Practice" />
        </Link>
      </div>


      <section className="relative w-full pt-[68px] screen744:!pt-[72px] screen1280:!pt-[80px] bg-[linear-gradient(180deg,rgba(244,247,255,0)_70%,#F4F7FF_100%),linear-gradient(115deg,#FCE3D5_0%,#F7F0EC_40%,#E6F6FB_100%)]">
        <TopHeader />

        <div className="mx-auto w-full max-w-[1236px] px-[20px] pt-[36px] screen744:!px-[48px] screen744:!pt-[56px] screen1280:!px-[40px] screen1440:!px-0 screen1280:!pt-[24px] screen1280:!pb-[40px] screen1280:!min-h-[560px] flex flex-col screen1280:!flex-row screen1280:!items-center screen1280:!justify-between screen1280:!gap-[24px]">
          {/* Copy + CTAs */}
          <div className="flex flex-col screen1280:!w-[620px] screen1280:!shrink-0">
            <h1
              className="m-0 mb-[14px] screen1280:!mb-[18px] text-[16px] leading-[24px] screen744:!text-[19px] screen744:!leading-[28px] screen1280:!text-[20px] screen1280:!leading-[30px] font-normal text-[#37465C] animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both motion-reduce:animate-none"
            >
              <span className="font-extrabold text-[#2554D6]">
                Free CELPIP Practice Tests
              </span>{" "}
              with Instant AI Scoring
            </h1>

            <p
              style={{ animationDelay: "80ms" }}
              className="m-0 text-[36px] leading-[42px] tracking-[-0.4px] screen744:!text-[56px] screen744:!leading-[62px] screen744:!tracking-[-0.5px] screen1280:!text-[65px] screen1280:!leading-[70px] font-bold text-[#212E42] animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both motion-reduce:animate-none"
            >
              Reach Your Target
              <br />
              <span className="text-[#4A7DFF]">CELPIP</span> Score.
              <br />
              <span className="italic text-[#F4845F]">Faster.</span>
            </p>

            {/* The header watches this CTA row: once it scrolls away, the
                header's Start Free Practice button appears. */}
            <div
              id="home-hero"
              style={{ animationDelay: "160ms" }}
              className="mt-[28px] screen744:!mt-[32px] screen1280:!mt-[40px] flex flex-col gap-[12px] screen744:!flex-row screen744:!items-center screen744:!gap-[16px] animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both motion-reduce:animate-none"
            >
              <Link
                ref={playOnView}
                href="/writing"
                onClick={() =>
                  trackCTAClick("Start Your Free Practice", "hero", {
                    itemId: "hero_primary_cta",
                  })
                }
                className={cn(
                  "group/start flex items-center justify-center gap-[8px] h-[54px] screen744:!h-[55px] screen744:!min-w-[270px] screen1280:!min-w-[260px] screen744:!px-[24px] rounded-full",
                  "bg-[#2554D6] text-white text-[17px] screen744:!text-[18px] font-medium whitespace-nowrap",
                  "shadow-[3.7px_3.9px_0_0_#759CFF]",
                  "transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "hover:bg-[#1F48BD] data-[play]:bg-[#1F48BD] hover:-translate-y-[2px] data-[play]:-translate-y-[2px] hover:shadow-[5px_6px_0_0_#759CFF] data-[play]:shadow-[5px_6px_0_0_#759CFF]",
                  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_#759CFF] active:duration-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6] focus-visible:ring-offset-2",
                  "motion-reduce:transition-none",
                )}
              >
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/start:rotate-90 group-data-[play]/start:rotate-90"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <RollingWords text="Start Your Free Practice" />
              </Link>
              <Link
                ref={playOnView}
                data-play-delay={350}
                href="/exam-overview"
                onClick={() =>
                  trackCTAClick("Take a Mock Test", "hero", {
                    itemId: "hero_secondary_cta",
                  })
                }
                className={cn(
                  "flex items-center justify-center h-[52px] screen744:!h-[55px] screen744:!w-[210px] screen1280:!w-[200px] rounded-full",
                  "bg-white/85 border-[1.5px] border-[#C9D5F5] text-[#2554D6] text-[17px] screen744:!text-[18px] font-medium whitespace-nowrap",
                  "transition-[transform,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "hover:bg-white data-[play]:bg-white hover:border-[#2554D6] data-[play]:border-[#2554D6] hover:-translate-y-[2px] data-[play]:-translate-y-[2px]",
                  "active:translate-y-0 active:scale-[0.98] active:duration-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6] focus-visible:ring-offset-2",
                  "motion-reduce:transition-none",
                )}
              >
                Take a Mock Test
              </Link>
            </div>

            {/* Trust row */}
            <div
              style={{ animationDelay: "240ms" }}
              className="mt-[18px] screen744:!mt-[20px] screen1280:!mt-[22px] flex flex-col gap-[10px] screen744:!flex-row screen744:!items-center screen744:!gap-[22px] screen1280:!gap-[18px] text-[14px] font-medium text-[#212E42] animate-in fade-in duration-700 fill-mode-both motion-reduce:animate-none"
            >
              <div className="flex items-center gap-[10px]">
                <Image
                  src="/images/people.png"
                  alt=""
                  width={57}
                  height={24}
                  className="w-[50px] h-[21px] screen1280:!w-[57px] screen1280:!h-[24px]"
                  priority
                />
                Trusted by {HOMEPAGE_USER_COUNT} test-takers
              </div>
              <span className="hidden screen1280:!block w-px h-[18px] bg-[#D5D6D8]" aria-hidden="true" />
              <div className="flex items-center gap-[8px] screen1280:!gap-[6px] pl-[2px] screen1280:!pl-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F8A6C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
                No credit card required
              </div>
            </div>
          </div>

          {/* Features + mascot (side by side below the copy on mobile/tablet,
              two separate columns on desktop) */}
          <div className="mt-[26px] screen744:!mt-[36px] screen1280:!mt-0 flex items-center justify-between gap-[12px] screen744:!gap-[24px] screen1280:!contents">
            <ul className="m-0 p-0 list-none flex flex-col gap-[14px] screen744:!gap-[18px] screen1280:!w-[260px] screen1280:!shrink-0">
              {heroFeatures.map((feature, index) => (
                <li
                  key={index}
                  ref={playOnView}
                  data-play-delay={index * 140}
                  style={{ animationDelay: `${200 + index * 70}ms` }}
                  className="group/feature flex items-center gap-[10px] screen1280:!gap-[14px] text-[15px] leading-[20px] screen744:!text-[18px] screen744:!leading-[24px] screen1280:!text-[19px] screen1280:!leading-[26px] text-[#212E42] animate-in fade-in slide-in-from-right-2 duration-700 fill-mode-both motion-reduce:animate-none"
                >
                  <span className="flex shrink-0 items-center justify-center w-[32px] h-[32px] rounded-[10px] screen744:!w-[40px] screen744:!h-[40px] screen1280:!w-[42px] screen1280:!h-[42px] screen1280:!rounded-[12px] bg-white/85 screen1280:!bg-white/80 border border-[#E3EBFF] text-[#2554D6] transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/feature:-translate-y-[2px] group-data-[play]/feature:-translate-y-[2px] group-hover/feature:bg-white group-data-[play]/feature:bg-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="w-[16px] h-[16px] screen744:!w-[19px] screen744:!h-[19px] screen1280:!w-[20px] screen1280:!h-[20px]">
                      {feature.icon}
                    </svg>
                  </span>
                  <span>{feature.label}</span>
                </li>
              ))}
            </ul>

            <div
              style={{ animationDelay: "200ms" }}
              className="shrink-0 w-[132px] h-[160px] screen744:!w-[220px] screen744:!h-[266px] screen744:!mr-[20px] screen1280:!mr-0 screen1280:!w-[300px] screen1280:!h-[363px] animate-in fade-in zoom-in-95 duration-700 fill-mode-both motion-reduce:animate-none"
            >
              <Image
                ref={playOnView}
                data-play-delay={300}
                src="/images/hero.png"
                alt="CELPIP Practice Test beaver mascot"
                width={300}
                height={363}
                priority
                fetchPriority="high"
                loading="eager"
                quality={75}
                sizes="(max-width: 743px) 132px, (max-width: 1279px) 220px, 300px"
                className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-rotate-2 data-[play]:-rotate-2 hover:-translate-y-[4px] data-[play]:-translate-y-[4px]"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;
