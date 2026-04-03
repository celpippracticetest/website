"use client";

import { Fragment } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Choose Your Practice",
    description:
      "Pick a single skill — Listening, Reading, Writing, or Speaking — or jump into a full-length mock exam that mirrors the real CELPIP format and timing.",
  },
  {
    number: "02",
    title: "Practice & Get AI Scoring",
    description:
      "Answer questions, record Speaking responses, or write emails and essays. Our AI scores your work in seconds and shows you exactly where to improve.",
  },
  {
    number: "03",
    title: "Track Progress & Improve",
    description:
      "Review detailed feedback for every question, compare your responses to sample answers at each CLB level, and watch your scores climb over time.",
  },
];

export default function PassportHowItWorks() {
  const { ref, inView } = useInView({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-16 lg:py-24 bg-parchment">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy leading-tight mb-4">
              Start Practicing in <span className="italic text-maple">Minutes</span>
            </h2>
            <p className="text-lg text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              No waiting, no appointments. Sign up and start your first practice session right away.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start gap-10 md:gap-0 lg:gap-0">
          {steps.map((step, i) => (
            <Fragment key={step.number}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15, duration: 0.4 }}
                className="relative flex-1 min-w-0 text-center md:text-left">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-navy/20 mb-5">
                  <span className="text-2xl font-bold text-navy font-display">{step.number}</span>
                </div>

                <h3 className="text-xl font-bold text-navy mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                  {step.description}
                </p>
              </motion.div>

              {i < steps.length - 1 && (
                <div
                  className="hidden md:flex h-16 w-8 shrink-0 items-center justify-center lg:w-12 xl:w-14"
                  aria-hidden>
                  <div className="h-px w-full border-t-2 border-dashed border-navy/25" />
                </div>
              )}
            </Fragment>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center mt-12">
          <Button
            size="lg"
            className="bg-maple hover:bg-maple-dark text-white font-semibold text-lg px-8 py-6 shadow-lg shadow-maple/20"
            style={{ fontFamily: "var(--font-body)" }}
            asChild>
            <Link href="/sign-up">
              Start Practicing Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
