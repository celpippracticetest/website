"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/v2/Button";
import { useHomepageCta } from "@/hooks/useHomepageCta";
import { cn } from "@/lib/utils";

const ScoreDiagnostic = () => {
  const { href, trackClick } = useHomepageCta();
  const [targetScore, setTargetScore] = useState("9");
  const [currentScore, setCurrentScore] = useState(6.5);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setCurrentScore((prev) => (prev >= 9 ? 6.5 : prev + 0.5));
        setIsAnimating(true);
      }, 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full max-w-[500px]"
    >
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 -z-10 w-full h-full bg-gradient-to-br from-primary1/5 via-secondary2/5 to-primary5/5 rounded-[32px] blur-2xl" />
      
      <div className="relative bg-white/40 backdrop-blur-2xl border border-white/30 rounded-[32px] p-6 screen744:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold bg-gradient-to-r from-primary1 to-secondary2 bg-clip-text text-transparent">AI Score Diagnostic</h3>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 rounded-full bg-gradient-to-r from-primary1 to-secondary2 opacity-30"
            />
          </div>

          {/* Target Score Selector */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group"
          >
            <label className="block text-sm font-semibold text-text1 mb-3 group-hover:text-primary1 transition-colors">
              Target CLB Score
            </label>
            <select
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 text-text1 font-medium focus:outline-none focus:ring-2 focus:ring-primary1 focus:bg-white/80 transition-all hover:bg-white/70 cursor-pointer"
            >
              <option value="7">CLB 7 - Intermediate</option>
              <option value="8">CLB 8 - Advanced</option>
              <option value="9">CLB 9 - Proficient</option>
              <option value="10">CLB 10+ - Expert</option>
            </select>
          </motion.div>

          {/* Exam Date Selector */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group"
          >
            <label className="block text-sm font-semibold text-text1 mb-3 group-hover:text-primary1 transition-colors">
              Exam Date
            </label>
            <input
              type="date"
              className="w-full h-12 px-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 text-text1 font-medium focus:outline-none focus:ring-2 focus:ring-primary1 focus:bg-white/80 transition-all hover:bg-white/70 cursor-pointer"
            />
          </motion.div>

          {/* Score Prediction Display */}
          <motion.div
            className="py-6 px-4 rounded-2xl bg-gradient-to-br from-primary1/10 to-secondary2/10 border border-primary1/20 backdrop-blur-sm"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-bold text-primary1 uppercase tracking-widest">Predicted Score</span>
              <motion.span
                key={currentScore}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-black bg-gradient-to-r from-primary1 to-secondary2 bg-clip-text text-transparent"
              >
                CLB {currentScore.toFixed(1)}
              </motion.span>
            </div>
            <div className="h-2.5 w-full bg-white/30 rounded-full overflow-hidden border border-white/20">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: `${(currentScore / 12) * 100}%` }}
                transition={{ type: "spring", stiffness: 40, damping: 10 }}
                className="h-full bg-gradient-to-r from-primary2 via-primary1 to-secondary2 shadow-lg"
              />
            </div>
            <p className="text-[11px] text-text3 mt-3 font-medium">
              ✓ Based on 70,000+ test patterns • Updated in real-time
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              href={href}
              onClick={() => trackClick("hero_diagnostic")}
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-lg hover:shadow-xl transition-all"
            >
              Generate My Study Plan
            </Button>
          </motion.div>
          
          {/* Trust Badge */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-text3 font-medium"
          >
            🔒 No credit card required • Instant access • 100% Free
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default ScoreDiagnostic;
