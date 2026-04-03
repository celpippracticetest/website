"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Users, BookOpen, Award, Clock } from "lucide-react";

const stats = [
  { icon: Users, value: "50,000+", label: "Test Takers", delay: 0 },
  { icon: BookOpen, value: "4,000+", label: "Practice Questions", delay: 0.1 },
  { icon: Award, value: "60+", label: "Full Mock Exams", delay: 0.2 },
  { icon: Clock, value: "24/7", label: "Access Anytime", delay: 0.3 },
];

export default function PassportTrustBar() {
  const { ref, inView } = useInView({ threshold: 0.3 });

  return (
    <section ref={ref} className="py-10 lg:py-14 bg-parchment">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: stat.delay, duration: 0.4 }}
              className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-navy/5 mb-3">
                <stat.icon className="w-5 h-5 text-maple" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-navy font-display">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
