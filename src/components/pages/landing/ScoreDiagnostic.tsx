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
    <div className="w-full max-w-[500px] bg-white/80 backdrop-blur-md border border-primary5 rounded-[32px] p-6 screen744:p-8 shadow-xl">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-text2 mb-2">
            What is your target CLB?
          </label>
          <select
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-outline bg-white focus:outline-none focus:ring-2 focus:ring-primary1 transition-all"
          >
            <option value="7">CLB 7</option>
            <option value="8">CLB 8</option>
            <option value="9">CLB 9</option>
            <option value="10">CLB 10+</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text2 mb-2">
            When is your exam?
          </label>
          <input
            type="date"
            className="w-full h-12 px-4 rounded-xl border border-outline bg-white focus:outline-none focus:ring-2 focus:ring-primary1 transition-all"
          />
        </div>

        <div className="py-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-semibold text-text3 uppercase tracking-wider">AI Score Prediction</span>
            <span className="text-2xl font-bold text-primary1">CLB {currentScore.toFixed(1)}</span>
          </div>
          <div className="h-3 w-full bg-primary5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${(currentScore / 12) * 100}%` }}
              transition={{ type: "spring", stiffness: 50 }}
              className="h-full bg-gradient-to-r from-primary2 to-primary1"
            />
          </div>
          <p className="text-[10px] text-text3 mt-2 italic">
            *Based on 70,000+ real test patterns
          </p>
        </div>

        <Button
          href={href}
          onClick={() => trackClick("hero_diagnostic")}
          variant="primary"
          size="lg"
          className="w-full"
        >
          Generate My Study Plan
        </Button>
        
        <p className="text-center text-xs text-text3">
          No credit card required • Instant access
        </p>
      </div>
    </div>
  );
};

export default ScoreDiagnostic;
