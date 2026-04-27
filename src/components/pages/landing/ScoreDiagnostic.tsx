"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/v2/Button";
import { useHomepageCta } from "@/hooks/useHomepageCta";

/**
 * Primary hero CTA: single high-conversion action (no form friction).
 */
const ScoreDiagnostic = () => {
  const { href, label, trackClick } = useHomepageCta();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12 }}
      className="relative w-full max-w-md screen1280:max-w-lg"
    >
      <div className="absolute inset-0 -z-10 rounded-[28px] bg-gradient-to-br from-primary1/8 via-secondary2/6 to-primary5/8 blur-2xl" />

      <div className="relative rounded-[28px] border border-white/40 bg-white/50 px-6 py-5 shadow-xl backdrop-blur-md screen744:px-8 screen744:py-6 screen1280:px-6 screen1280:py-4">
        <p className="mb-4 text-center text-sm font-medium leading-snug text-text2 screen744:text-base screen1280:mb-3">
          Full mock exams, AI feedback, and skill practice—ready when you are.
        </p>
        <Button
          href={href}
          onClick={() => trackClick("hero_primary_cta")}
          variant="primary"
          size="lg"
          className="w-full font-bold shadow-lg transition-all hover:shadow-xl"
        >
          {label}
        </Button>
        <p className="mt-3 text-center text-xs font-medium text-text3 screen1280:mt-2">No credit card required</p>
      </div>
    </motion.div>
  );
};

export default ScoreDiagnostic;
