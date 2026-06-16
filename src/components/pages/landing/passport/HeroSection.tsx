"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Play, Shield, Star } from "lucide-react";

const HERO_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663468453012/Nvow3xsVp4swjjq4NHT4Qb/hero-bg-g9DwStDGBNv3J3K25xbmtK.webp";

/** Hero h1 highlight after “Your Fastest Path to …” — edit this list to change rotation. */
export const PASSPORT_HERO_HEADLINE_HIGHLIGHTS = [
  "Canadian PR",
  "Australian PR",
  "CLB 9+",
  "Citizenship",
] as const;

const ROTATE_MS = 4500;

function PassportHeroHeadlineHighlight() {
  const [index, setIndex] = useState(0);
  const phrases = PASSPORT_HERO_HEADLINE_HIGHLIGHTS;

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [phrases.length]);

  return (
    <span className="text-amber-light italic block min-h-[1.2em] w-full">
      <AnimatePresence mode="wait">
        <motion.span
          key={phrases[index]}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
          className="block">
          {phrases[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function PassportHeroSection() {
  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary1/75 via-navy/78 to-[#151d2e]/92" />
      </div>

      <div className="container relative z-10 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left order-1">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Shield className="w-4 h-4 text-amber-light" />
              <span className="text-sm font-medium text-white/90" style={{ fontFamily: "var(--font-body)" }}>
                Trusted by 50,000+ Canadian PR seekers
              </span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6 flex flex-col gap-1 items-center lg:items-start">
              <span className="block text-white">Your Fastest Path to</span>
              <PassportHeroHeadlineHighlight />
            </h1>

            <p
              className="text-lg sm:text-xl text-white/80 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}>
              Practice with AI-scored mock exams that mirror the real CELPIP test. Get instant feedback on Speaking and
              Writing, and walk into test day with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button
                size="lg"
                className="bg-maple hover:bg-maple-dark text-white font-semibold text-lg px-8 py-6 shadow-lg shadow-maple/30 hover:shadow-xl hover:shadow-maple/40 transition-all"
                style={{ fontFamily: "var(--font-body)" }}
                asChild>
                <Link href="/sign-up">
                  Start Free Practice
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-medium text-lg px-8 py-6 bg-transparent"
                style={{ fontFamily: "var(--font-body)" }}
                asChild>
                <Link href="/exam-overview">
                  <Play className="w-5 h-5 mr-2" />
                  Try a free mock test
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 justify-center lg:justify-start">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-light text-amber-light" />
                ))}
                <span className="text-sm text-white/70 ml-2" style={{ fontFamily: "var(--font-body)" }}>
                  AI feedback included
                </span>
              </div>
              <div className="h-4 w-px bg-white/30" />
              <span
                className="text-sm text-white/70 whitespace-nowrap shrink-0"
                style={{ fontFamily: "var(--font-body)" }}>
                60+ Mock Exams
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex justify-center order-2">
            <div className="relative">
              <Image
                src="/images/sample.png"
                alt="CELPIP mock exam preview"
                width={640}
                height={853}
                className="w-48 sm:w-56 lg:w-96 xl:w-[28rem] 2xl:w-[32rem] h-auto max-w-full rounded-3xl shadow-2xl shadow-black/30"
                sizes="(max-width: 640px) 192px, (max-width: 1024px) 224px, (max-width: 1280px) 384px, (max-width: 1536px) 448px, 512px"
                priority
              />
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -right-12 top-1/4 bg-white rounded-xl shadow-lg p-4 border border-border hidden lg:block">
                <div className="text-xs text-muted-foreground mb-1" style={{ fontFamily: "var(--font-body)" }}>
                  Your Score
                </div>
                <div className="text-3xl font-bold text-navy">CLB 9</div>
                <div className="text-xs text-green-600 font-medium mt-1" style={{ fontFamily: "var(--font-body)" }}>
                  +2 from last week
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full">
          <path
            d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z"
            fill="#F4F7FF"
          />
        </svg>
      </div>
    </section>
  );
}
