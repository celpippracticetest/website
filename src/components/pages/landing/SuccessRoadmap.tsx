"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/v2/Button";

const SuccessRoadmap = () => {
  const steps = [
    { 
      day: "1", 
      title: "Diagnostic Test", 
      desc: "Baseline Assessment",
      detail: "CLB 6 Baseline",
      icon: "📊",
      color: "from-primary1 to-primary2", 
      bgColor: "bg-primary5/20"
    },
    { 
      day: "7", 
      title: "Speaking Drills", 
      desc: "Intensive Practice",
      detail: "Improvement: +1.0",
      icon: "🎤",
      color: "from-secondary2 to-secondary1", 
      bgColor: "bg-secondary5/20"
    },
    { 
      day: "14", 
      title: "Full Mock Exam", 
      desc: "Comprehensive Test",
      detail: "Confidence: 90%",
      icon: "✅",
      color: "from-success to-success/80", 
      bgColor: "bg-success5/20"
    },
    { 
      day: "21", 
      title: "Exam Day", 
      desc: "Final Assessment",
      detail: "CLB10+",
      icon: "🏆",
      color: "from-primary2 to-primary1", 
      bgColor: "bg-primary5/20"
    },
  ];

  return (
    <section className="py-20 screen1280:py-32 bg-gradient-to-b from-white via-primary5/5 to-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary2/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary1/5 rounded-full blur-3xl -z-10" />
      
      <div className="max-w-[1440px] mx-auto px-6 screen1280:px-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 screen1280:mb-24"
        >
          <h2 className="text-4xl screen744:text-5xl screen1280:text-6xl font-black bg-gradient-to-r from-primary1 via-primary2 to-secondary2 bg-clip-text text-transparent mb-4">
            Your 21-Day Success Path
          </h2>
          <p className="text-lg text-text2 max-w-[600px] mx-auto font-medium">
            A structured journey from baseline to CLB 10+. Proven by thousands of successful
            candidates.
          </p>
        </motion.div>

        <div className="relative">
          <div className="hidden screen1280:block absolute top-1/3 left-0 w-full h-1 bg-gradient-to-r from-primary1 via-secondary2 to-primary2 -translate-y-1/2 z-0">
            <motion.div
              className="h-full bg-gradient-to-r from-primary1 to-secondary2"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              viewport={{ once: true }}
            />
          </div>

          <div className="grid grid-cols-1 screen744:grid-cols-2 screen1280:grid-cols-4 gap-6 screen1280:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="relative z-10 group"
              >
                <div className={`relative h-full p-6 screen744:p-7 rounded-3xl border border-white/40 backdrop-blur-xl ${step.bgColor} hover:border-white/60 transition-all duration-300 shadow-lg hover:shadow-2xl`}>
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  
                  <div className="relative z-10 flex flex-col items-center text-center h-full">
                    <motion.div
                      className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex flex-col items-center justify-center gap-0.5 mb-5 shadow-xl group-hover:scale-110 transition-transform duration-300`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                        Day
                      </span>
                      <span className="text-3xl font-black text-white leading-none tabular-nums">
                        {step.day}
                      </span>
                    </motion.div>

                    <span className="text-4xl mb-3 group-hover:scale-125 transition-transform duration-300">{step.icon}</span>

                    <h3 className="text-xl font-bold text-text1 mb-2 group-hover:text-primary1 transition-colors">{step.title}</h3>
                    
                    <p className="text-sm text-text2 font-medium mb-3">{step.desc}</p>
                    
                    <motion.div
                      className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${step.color}`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {step.detail}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16 screen1280:mt-20 flex flex-col items-center gap-6"
        >
          <p className="text-text2 font-medium">Ready to start your journey?</p>
          <Button href="/sign-up" variant="primary" size="lg">
            Start your plan
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default SuccessRoadmap;
