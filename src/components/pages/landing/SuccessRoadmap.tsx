"use client";

import React from "react";
import { motion } from "framer-motion";

const SuccessRoadmap = () => {
  const steps = [
    { day: "Day 1", title: "Diagnostic Test", desc: "Baseline: CLB 6", color: "bg-primary5", textColor: "text-primary1" },
    { day: "Day 7", title: "Speaking Drills", desc: "Improvement: +1.0", color: "bg-secondary5", textColor: "text-secondary2" },
    { day: "Day 14", title: "Full Mock Exam", desc: "Confidence: 90%", color: "bg-success5", textColor: "text-success" },
    { day: "Day 21", title: "Exam Day", desc: "Outcome: CLB 9+", color: "bg-primary2", textColor: "text-white" },
  ];

  return (
    <section className="py-16 screen1280:py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 screen1280:px-10">
        <div className="text-center mb-12 screen1280:mb-20">
          <h2 className="text-3xl screen1280:text-4xl font-bold text-text1 mb-4">Your Path to CLB 9+ in 21 Days</h2>
          <p className="text-text2 max-w-[600px] mx-auto">
            Stop guessing. Follow our structured roadmap to hit your target score.
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden screen1280:block absolute top-1/2 left-0 w-full h-1 bg-primary5 -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 screen744:grid-cols-2 screen1280:grid-cols-4 gap-8 screen1280:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center text-center p-6 rounded-[32px] border border-primary5 bg-white shadow-lg hover:shadow-xl transition-all"
              >
                <div className={`w-16 h-16 rounded-full ${step.color} ${step.textColor} flex items-center justify-center text-xl font-bold mb-4 shadow-sm`}>
                  {step.day}
                </div>
                <h3 className="text-xl font-bold text-text1 mb-2">{step.title}</h3>
                <p className="text-text2 font-medium">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuccessRoadmap;
