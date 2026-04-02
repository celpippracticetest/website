"use client";

import React from "react";
import { motion } from "framer-motion";

const TrustRibbon = () => {
  const itemsA = [
    "Verified CLB 10",
    "PR Approved",
    "70,000+ Users",
    "98.4% Success Rate",
    "AI-Powered Scoring",
    "Realistic Mock Exams",
  ];

  const itemsB = [
    "Trusted by Candidates",
    "Updated Weekly",
    "Instant Feedback",
    "No Credit Card Required",
    "Free Mock Test",
    "Custom Study Plan",
  ];

  return (
    <div className="w-full overflow-hidden bg-primary1 py-3 screen744:py-4 flex flex-col gap-2 screen744:gap-3">
      <div className="flex whitespace-nowrap">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="flex gap-8 screen744:gap-16 items-center"
        >
          {[...itemsA, ...itemsA].map((item, index) => (
            <span
              key={index}
              className="text-white text-xs screen744:text-sm font-bold uppercase tracking-widest flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 bg-secondary2 rounded-full" />
              {item}
            </span>
          ))}
        </motion.div>
      </div>
      <div className="flex whitespace-nowrap">
        <motion.div
          animate={{ x: ["-50%", "0%"] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          className="flex gap-8 screen744:gap-16 items-center"
        >
          {[...itemsB, ...itemsB].map((item, index) => (
            <span
              key={index}
              className="text-white/80 text-[10px] screen744:text-xs font-medium uppercase tracking-widest flex items-center gap-2"
            >
              <span className="w-1 h-1 bg-white/40 rounded-full" />
              {item}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default TrustRibbon;
