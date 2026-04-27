"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import ScoreDiagnostic from "./ScoreDiagnostic";
import { HeroLiveStatsRotatingListItem } from "./HeroLiveStatsRotatingListItem";
import TrustRibbon from "./TrustRibbon";
import { cn } from "@/lib/utils";
import { PrepEcosystemCard } from "./PrepEcosystemCard";
import { prepEcosystemItems } from "./prepEcosystemItems";

export type HeroModernProps = {
  heroImage: {
    imageUrl: string;
    altText: string;
  };
  withFixedHeader?: boolean;
};

/**
 * Style 2 (`passport` / `?s=2`): All-new marketing hero — diagnostic CTA, trust ribbon,
 * and prep ecosystem grid (distinct from legacy / redesign).
 */
const HeroModern = ({
  heroImage,
  withFixedHeader = true,
}: HeroModernProps) => {
  return (
    <div className="flex flex-col w-full bg-[#F4F7FF]">
      <section
        className={cn(
          "relative overflow-hidden pb-16 screen1280:pb-10",
          withFixedHeader
            ? "pt-6 screen744:pt-12 screen1280:pt-3"
            : "pt-10 screen744:pt-20 screen1280:pt-32",
        )}
      >
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary5/30 to-transparent pointer-events-none z-0" />
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-secondary5/20 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="max-w-[1440px] mx-auto px-6 screen1280:px-10 relative z-10">
          <div className="flex w-full flex-col items-center gap-6 text-center screen1280:items-start screen1280:gap-3 screen1280:text-left">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex max-w-full items-center justify-center gap-2 rounded-lg border border-text3/20 bg-white/80 px-3 py-1.5 text-balance text-left text-xs font-medium normal-case leading-snug text-text2 shadow-sm backdrop-blur-sm screen1280:justify-start screen1280:text-sm"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary1/70"
                aria-hidden
              />
              <span>
                70,000+ learners — CELPIP prep and mock exams
              </span>
            </motion.p>

            {/* Mobile: h1 → compact bullets → CTA (above fold) → art. Desktop: 3-col row, CTA full width row 2. */}
            <div className="grid w-full max-w-full grid-cols-1 gap-y-2.5 max-[1279px]:place-items-stretch screen1280:grid-cols-3 screen1280:grid-rows-[auto_auto] screen1280:items-center screen1280:gap-x-8 screen1280:gap-y-3">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-0 max-[1279px]:!mb-0 screen744:mb-0.5 screen1280:col-start-1 screen1280:row-start-1 screen1280:mb-0 screen1280:min-w-0 screen1280:self-center screen1280:text-left text-3xl font-extrabold leading-[1.1] text-text1 screen744:text-4xl screen1280:text-[2.5rem] screen1280:leading-[1.08] screen1440:text-5xl"
              >
                CELPIP Practice Test —{" "}
                <span className="text-primary1">Know Your Score</span>
                <br className="screen1280:hidden" />
                <span className="hidden screen1280:inline"> </span>
                Before Exam Day
              </motion.h1>

              <motion.ul
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="screen1280:col-start-2 screen1280:row-start-1 list-none w-full max-w-[600px] text-left text-sm leading-snug text-text2 max-[1279px]:!mb-0 max-[1279px]:!space-y-1 space-y-1 screen744:text-base screen1280:mx-0 screen1280:mb-0 screen1280:w-auto screen1280:shrink-0 screen1280:space-y-3 screen1280:text-lg screen1280:leading-normal screen1440:text-xl mx-auto"
              >
                {[
                  "60+ mock exams",
                  "3,000+ sample tests",
                  "AI-powered scoring",
                  "Official Exam Mode",
                ].map((line) => (
                  <li
                    key={line}
                    className="flex gap-2.5 max-[1279px]:!gap-2.5 screen1280:gap-3"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary1 max-[1279px]:!mt-1.5 max-[1279px]:!self-start screen1280:mt-2.5"
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
                <HeroLiveStatsRotatingListItem className="hidden screen1280:block" />
              </motion.ul>

              <div className="flex w-full justify-center px-0 py-0.5 screen1280:col-span-3 screen1280:row-start-2">
                <ScoreDiagnostic />
              </div>

              {/* No motion on image wrapper: opacity 0 in Framer can delay LCP. */}
              <div
                className="relative flex w-full max-w-[min(72vw,260px)] max-[1279px]:!mx-auto max-[1279px]:!mb-0 flex-col screen1280:col-start-3 screen1280:row-start-1 screen1280:mb-0 screen1280:max-w-[min(360px,34vw)] screen1280:shrink-0"
              >
                <div className="relative mx-auto h-[200px] w-full max-w-[260px] screen744:h-[220px] screen1280:ml-auto screen1280:mr-0 screen1280:h-auto screen1280:aspect-square screen1280:max-h-none screen1280:max-w-[min(360px,34vw)]">
                  <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.altText}
                    fill
                    className="object-contain object-bottom drop-shadow-2xl z-20"
                    priority
                    sizes="(max-width: 1279px) 260px, min(360px, 34vw)"
                  />
                  <motion.div
                    animate={{ y: [0, -20, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "easeInOut",
                    }}
                    className="absolute top-10 right-0 hidden rounded-2xl border border-primary5 bg-white p-4 shadow-xl z-30 screen1024:block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success5 font-bold text-success">
                        9.0
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-text3">
                          Target Score
                        </p>
                        <p className="text-sm font-bold text-text1">
                          CLB 9+ Reached
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, 20, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 5,
                      ease: "easeInOut",
                    }}
                    className="absolute bottom-20 left-0 hidden rounded-2xl border border-primary5 bg-white p-4 shadow-xl z-30 screen1024:block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary5 font-bold text-primary1">
                        AI
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-text3">
                          AI Coach
                        </p>
                        <p className="text-sm font-bold text-text1">
                          Feedback Ready
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrustRibbon />

      <section className="py-16 screen1280:py-24">
        <div className="max-w-[1440px] mx-auto px-6 screen1280:px-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl screen744:text-3xl font-bold text-text1">
              Explore Our Prep Ecosystem
            </h2>
          </div>
          <div className="grid grid-cols-2 screen744:grid-cols-4 screen1280:grid-cols-7 gap-4 screen744:gap-6">
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

export default HeroModern;
