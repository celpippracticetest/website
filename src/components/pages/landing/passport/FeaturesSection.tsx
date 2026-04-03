"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Headphones, BookOpen, PenTool, Mic, Sparkles, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Headphones,
    title: "Listening",
    subtitle: "Train Your Ears",
    description:
      "Practice with real-life conversations, accents, and timed questions. Build the focus you need when the audio plays once.",
    items: ["Daily audio practice sets", "Multiple accent training", "Timed question drills"],
    color: "bg-primary6 text-primary1",
    borderColor: "border-primary5",
  },
  {
    icon: BookOpen,
    title: "Reading",
    subtitle: "Read Smarter, Not Harder",
    description:
      "Master skimming, scanning, and comprehension strategies that match exactly how CELPIP tests your reading ability.",
    items: ["Auto-marked practice", "Skim & scan training", "Real CELPIP question types"],
    color: "bg-success_light text-success",
    borderColor: "border-emerald-200",
  },
  {
    icon: PenTool,
    title: "Writing",
    subtitle: "Write with Confidence",
    description:
      "Get AI feedback that thinks like a CELPIP examiner. Learn to structure emails and essays that score high every time.",
    items: ["AI-powered scoring", "Sample answers at each CLB", "Line-by-line feedback"],
    color: "bg-secondary6 text-secondary2",
    borderColor: "border-secondary5",
  },
  {
    icon: Mic,
    title: "Speaking",
    subtitle: "Find Your Voice",
    description:
      "Record your answers, get instant fluency and pronunciation feedback, and build the confidence to speak clearly under pressure.",
    items: ["Real test prompts", "Pronunciation analysis", "Fluency scoring"],
    color: "bg-rose-50 text-rose-700",
    borderColor: "border-rose-200",
  },
];

export default function PassportFeaturesSection() {
  const { ref, inView } = useInView({ threshold: 0.1 });

  return (
    <section id="features" ref={ref} className="py-16 lg:py-24 bg-parchment">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-maple/10 text-maple text-sm font-medium mb-4"
              style={{ fontFamily: "var(--font-body)" }}>
              <Sparkles className="w-4 h-4" />
              All Four CELPIP Modules
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy leading-tight mb-4">
              Practice Every Skill the <span className="italic text-maple">Real Test</span> Demands
            </h2>
            <p className="text-lg text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              From Listening to Speaking, our AI-powered platform covers every module with the same format and timing as
              the official CELPIP exam.
            </p>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 lg:gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`bg-white rounded-xl p-6 lg:p-8 border ${feature.borderColor} hover:shadow-lg transition-shadow duration-300`}>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.color} mb-4`}>
                <feature.icon className="w-6 h-6" />
              </div>

              <div className="mb-1">
                <span
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  style={{ fontFamily: "var(--font-body)" }}>
                  {feature.subtitle}
                </span>
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-navy mb-3">{feature.title} Practice</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                {feature.description}
              </p>

              <ul className="space-y-2">
                {feature.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-navy/80"
                    style={{ fontFamily: "var(--font-body)" }}>
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-8 lg:mt-12 bg-navy rounded-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-6 items-center">
            <div className="p-8 lg:p-12">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-amber-light text-sm font-medium mb-4"
                style={{ fontFamily: "var(--font-body)" }}>
                <Sparkles className="w-4 h-4" />
                AI-Powered
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                Instant Feedback That Feels Like a Real Tutor
              </h3>
              <p className="text-white/70 leading-relaxed mb-6" style={{ fontFamily: "var(--font-body)" }}>
                Our AI scoring system analyzes your Speaking and Writing responses in seconds, giving you detailed,
                actionable feedback aligned with official CELPIP scoring criteria. Know exactly what to fix and how to
                improve.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Speaking Evaluation", "Writing Analysis", "Score Prediction"].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm border border-white/10"
                    style={{ fontFamily: "var(--font-body)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-6 lg:p-8 flex justify-center">
              <Image
                src="/images/bear_mobile.png"
                alt="AI Feedback System"
                width={640}
                height={640}
                className="w-64 lg:w-80 h-auto rounded-xl shadow-lg"
                sizes="(max-width: 1024px) 256px, 320px"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
