"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/v2/Button";
import { useHomepageCta } from "@/hooks/useHomepageCta";
import {
  PENDING_HOME_DIAGNOSTIC_KEY,
  type PendingHomeDiagnostic,
} from "@/lib/pendingHomeDiagnostic";

const ScoreDiagnostic = () => {
  const { href, trackClick } = useHomepageCta();
  const [targetScore, setTargetScore] = useState("9");
  const [examDate, setExamDate] = useState("");
  const [currentScore, setCurrentScore] = useState(6.5);

  const persistAndTrack = () => {
    try {
      const payload: PendingHomeDiagnostic = {
        targetClb: targetScore,
        ...(examDate.trim() ? { examDateIso: examDate.trim() } : {}),
      };
      localStorage.setItem(PENDING_HOME_DIAGNOSTIC_KEY, JSON.stringify(payload));
    } catch {
      // ignore localStorage errors (private mode / quota exceeded)
    }
    trackClick("hero_diagnostic");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeout(() => {
        setCurrentScore((prev) => (prev >= 9 ? 6.5 : prev + 0.5));
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full max-w-[500px] screen1280:max-w-[min(1100px,100%)]"
    >
      <div className="absolute inset-0 -z-10 h-full w-full rounded-[32px] bg-gradient-to-br from-primary1/5 via-secondary2/5 to-primary5/5 blur-2xl" />

      <div className="relative rounded-[32px] border border-white/30 bg-white/40 p-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:shadow-3xl screen744:p-8">
        <div className="space-y-6 screen1280:space-y-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="bg-gradient-to-r from-primary1 to-secondary2 bg-clip-text text-lg font-bold text-transparent">
              AI Study Plan Generator
            </h3>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="h-6 w-6 rounded-full bg-gradient-to-r from-primary1 to-secondary2 opacity-30"
            />
          </div>

          <div className="flex flex-col gap-6 screen1280:flex-row screen1280:items-stretch screen1280:gap-5">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="group screen1280:flex-1 screen1280:min-w-0"
            >
              <label className="mb-3 block text-sm font-semibold text-text1 transition-colors group-hover:text-primary1">
                Target CLB Score
              </label>
              <select
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="h-12 w-full cursor-pointer rounded-2xl border border-white/40 bg-white/60 px-4 font-medium text-text1 backdrop-blur-sm transition-all hover:bg-white/70 focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary1"
              >
                <option value="7">CLB 7 - Intermediate</option>
                <option value="8">CLB 8 - Advanced</option>
                <option value="9">CLB 9 - Proficient</option>
                <option value="10">CLB 10+ - Expert</option>
              </select>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="group screen1280:flex-1 screen1280:min-w-0"
            >
              <label className="mb-3 block text-sm font-semibold text-text1 transition-colors group-hover:text-primary1">
                Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="h-12 w-full cursor-pointer rounded-2xl border border-white/40 bg-white/60 px-4 font-medium text-text1 backdrop-blur-sm transition-all hover:bg-white/70 focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary1"
              />
            </motion.div>

            <motion.div
              className="flex flex-col rounded-2xl border border-primary1/20 bg-gradient-to-br from-primary1/10 to-secondary2/10 px-4 py-5 backdrop-blur-sm screen1280:flex-1 screen1280:min-w-0 screen1280:py-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-primary1">
                  Predicted Score
                </span>
                <motion.span
                  key={currentScore}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-r from-primary1 to-secondary2 bg-clip-text text-2xl font-black text-transparent screen1280:text-xl screen1440:text-2xl"
                >
                  CLB {currentScore.toFixed(1)}
                </motion.span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/20 bg-white/30">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${(currentScore / 12) * 100}%` }}
                  transition={{ type: "spring", stiffness: 40, damping: 10 }}
                  className="h-full bg-gradient-to-r from-primary2 via-primary1 to-secondary2 shadow-lg"
                />
              </div>
              <p className="mt-2 text-[11px] font-medium leading-snug text-text3">
                ✓ Based on 70,000+ test patterns • Updated in real-time
              </p>
            </motion.div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              href={href}
              onClick={persistAndTrack}
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-lg transition-all hover:shadow-xl"
            >
              Generate My Study Plan
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs font-medium text-text3"
          >
            🔒 No credit card required • Instant access
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default ScoreDiagnostic;
