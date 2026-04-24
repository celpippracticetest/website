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
          "relative pb-16 overflow-hidden",
          withFixedHeader
            ? "pt-6 screen744:pt-12 screen1280:pt-16"
            : "pt-10 screen744:pt-20 screen1280:pt-32",
        )}
      >
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary5/30 to-transparent pointer-events-none z-0" />
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-secondary5/20 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="max-w-[1440px] mx-auto px-6 screen1280:px-10 relative z-10">
          <div className="flex flex-col items-center screen1280:items-start text-center screen1280:text-left w-full gap-8 screen1280:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary1 text-white text-xs font-bold uppercase tracking-widest"
            >
              <span className="w-2 h-2 bg-secondary2 rounded-full animate-pulse" />
              #1 Top Rated CELPIP Resource 2026
            </motion.div>

            {/* Desktop: heading + bullets + image in one row */}
            <div className="flex flex-col w-full items-center screen1280:flex-row screen1280:items-center screen1280:gap-10">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl screen744:text-5xl font-extrabold text-text1 leading-[1.1] mb-6 screen1280:mb-0 screen1280:flex-1 screen1280:min-w-0 screen1280:text-left"
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
                className="text-lg screen744:text-xl text-text2 max-w-[600px] mb-6 screen1280:mb-0 space-y-3 text-left mx-auto screen1280:mx-0 w-full screen1280:w-auto screen1280:shrink-0 list-none"
              >
                {[
                  "60+ mock exams",
                  "3,000+ sample tests",
                  "AI-powered scoring",
                  "Official Exam Mode",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span
                      className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary1"
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
                <HeroLiveStatsRotatingListItem />
              </motion.ul>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="relative mt-2 mb-2 w-full max-w-[min(360px,92vw)] screen1280:mt-0 screen1280:mb-0 screen1280:flex-1 screen1280:min-w-0 screen1280:max-w-[min(420px,38vw)] flex justify-center screen1280:justify-end"
              >
                <div className="relative aspect-square w-full max-w-[360px] screen1280:max-w-[420px] screen1280:ml-auto">
                  <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.altText}
                    fill
                    className="object-contain drop-shadow-2xl z-20"
                    priority
                    sizes="(max-width: 1279px) min(360px, 92vw), min(420px, 38vw)"
                  />
                  <motion.div
                    animate={{ y: [0, -20, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "easeInOut",
                    }}
                    className="absolute top-10 right-0 bg-white p-4 rounded-2xl shadow-xl z-30 border border-primary5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-success5 text-success rounded-full flex items-center justify-center font-bold">
                        9.0
                      </div>
                      <div>
                        <p className="text-[10px] text-text3 font-bold uppercase">
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
                    className="absolute bottom-20 left-0 bg-white p-4 rounded-2xl shadow-xl z-30 border border-primary5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary5 text-primary1 rounded-full flex items-center justify-center font-bold">
                        AI
                      </div>
                      <div>
                        <p className="text-[10px] text-text3 font-bold uppercase">
                          AI Coach
                        </p>
                        <p className="text-sm font-bold text-text1">
                          Feedback Ready
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            <div className="w-full flex justify-center">
              <ScoreDiagnostic />
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
