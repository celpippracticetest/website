"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Monitor, Timer, BarChart3, RefreshCw } from "lucide-react";

const STUDY_SCENE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663468453012/Nvow3xsVp4swjjq4NHT4Qb/study-scene-7VPz3kNfbkQxF6swL8khuo.webp";

const examFeatures = [
  {
    icon: Monitor,
    title: "Real Exam Interface",
    description: "Same layout, same question types, same experience as the official CELPIP test.",
  },
  {
    icon: Timer,
    title: "Timed Like the Real Test",
    description: "Practice under real time pressure so nothing surprises you on test day.",
  },
  {
    icon: BarChart3,
    title: "Detailed Score Reports",
    description: "See your CLB score breakdown for each section with improvement tips.",
  },
  {
    icon: RefreshCw,
    title: "Unlimited Retakes",
    description: "Take each mock exam as many times as you need until you hit your target score.",
  },
];

export default function PassportMockExamPreview() {
  const { ref, inView } = useInView({ threshold: 0.1 });

  return (
    <section id="mock-exams" ref={ref} className="py-16 lg:py-24 bg-white">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <img src={STUDY_SCENE} alt="CELPIP study preparation" className="w-full h-auto" loading="lazy" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-navy" style={{ fontFamily: "var(--font-body)" }}>
                      Mock Exam Complete
                    </div>
                    <ul
                      className="text-xs text-muted-foreground space-y-0.5 list-none m-0 p-0 text-left"
                      style={{ fontFamily: "var(--font-body)" }}>
                      <li>Listening: CLB 10</li>
                      <li>Reading: CLB 9</li>
                      <li>Writing: CLB 9</li>
                      <li>Speaking: CLB 10</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="order-1 lg:order-2">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/5 text-navy text-sm font-medium mb-4"
              style={{ fontFamily: "var(--font-body)" }}>
              <Monitor className="w-4 h-4" />
              Full-Length Mock Exams
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy leading-tight mb-4">
              Practice That Mirrors the <span className="italic text-maple">Real CELPIP</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
              Our 60+ full-length mock exams are built to match the official test — same format, same timing, same
              scoring. Walk into test day feeling like you&apos;ve already been there.
            </p>

            <div className="space-y-5">
              {examFeatures.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
                  className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-parchment flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-navy mb-1" style={{ fontFamily: "var(--font-body)" }}>
                      {feature.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
