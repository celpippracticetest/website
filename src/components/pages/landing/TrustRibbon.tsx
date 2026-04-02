"use client";

import React from "react";
import { motion } from "framer-motion";

const TrustRibbon = () => {
  const itemsA = [
    { text: "Verified CLB 10", icon: "✓" },
    { text: "PR Approved", icon: "✓" },
    { text: "70,000+ Users", icon: "👥" },
    { text: "98.4% Success Rate", icon: "📈" },
    { text: "AI-Powered Scoring", icon: "🤖" },
    { text: "Realistic Mock Exams", icon: "📝" },
  ];

  const itemsB = [
    { text: "Trusted by Candidates", icon: "⭐" },
    { text: "Updated Weekly", icon: "🔄" },
    { text: "Instant Feedback", icon: "⚡" },
    { text: "No Credit Card Required", icon: "💳" },
    { text: "Free Mock Test", icon: "🎁" },
    { text: "Custom Study Plan", icon: "📋" },
  ];

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-primary1 via-primary2 to-secondary2 py-4 screen744:py-5 flex flex-col gap-3 screen744:gap-4 relative">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
      
      {/* First Row - Forward Motion */}
      <div className="flex whitespace-nowrap relative z-10">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          className="flex gap-6 screen744:gap-12 items-center"
        >
          {[...itemsA, ...itemsA].map((item, index) => (
            <motion.span
              key={index}
              whileHover={{ scale: 1.05 }}
              className="text-white text-xs screen744:text-sm font-bold uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all cursor-default"
            >
              <span className="text-sm">{item.icon}</span>
              {item.text}
            </motion.span>
          ))}
        </motion.div>
      </div>
      
      {/* Second Row - Reverse Motion */}
      <div className="flex whitespace-nowrap relative z-10">
        <motion.div
          animate={{ x: ["-50%", "0%"] }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          className="flex gap-6 screen744:gap-12 items-center"
        >
          {[...itemsB, ...itemsB].map((item, index) => (
            <motion.span
              key={index}
              whileHover={{ scale: 1.05 }}
              className="text-white/90 text-[10px] screen744:text-xs font-semibold uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all cursor-default"
            >
              <span className="text-xs">{item.icon}</span>
              {item.text}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default TrustRibbon;
