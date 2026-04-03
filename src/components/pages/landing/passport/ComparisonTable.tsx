"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Check, X, Minus } from "lucide-react";

const features = [
  { name: "AI-Powered Scoring", us: true, comp1: false },
  { name: "Speaking Practice with Feedback", us: true, comp1: "limited" },
  { name: "Full-Length Mock Exams", us: "60+", comp1: "10-15" },
  { name: "Real CELPIP Format", us: true, comp1: "partial" },
  { name: "Instant Score Reports", us: true, comp1: false },
  { name: "Personalized Study Plans", us: true, comp1: false },
  { name: "Mobile Optimized", us: true, comp1: "partial" },
  { name: "Free Trial Available", us: true, comp1: true },
  { name: "Price (Weekly)", us: "$14.99", comp1: "$25-45" },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-5 h-5 text-green-600 mx-auto" />;
  if (value === false) return <X className="w-5 h-5 text-red-400 mx-auto" />;
  if (value === "limited" || value === "partial")
    return <Minus className="w-5 h-5 text-secondary2 mx-auto" />;
  return (
    <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-body)" }}>
      {value}
    </span>
  );
}

export default function PassportComparisonTable() {
  const { ref, inView } = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-16 lg:py-24 bg-parchment">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy leading-tight mb-4">
            Why Choose <span className="italic text-maple">CELPIP Practice Test?</span>
          </h2>
          <p className="text-lg text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            See how we compare to other CELPIP preparation platforms in Canada.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <div className="min-w-[min(100%,420px)] max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="grid grid-cols-3 bg-navy text-white">
                <div className="p-4 text-sm font-semibold" style={{ fontFamily: "var(--font-body)" }}>
                  Feature
                </div>
                <div className="p-4 text-center">
                  <div className="text-sm font-bold" style={{ fontFamily: "var(--font-body)" }}>
                    CELPIP Practice Test
                  </div>
                  <div className="text-xs text-white/60 mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
                    (Us)
                  </div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-sm font-medium text-white/80" style={{ fontFamily: "var(--font-body)" }}>
                    Competitors
                  </div>
                </div>
              </div>

              {features.map((feature, i) => (
                <div
                  key={feature.name}
                  className={`grid grid-cols-3 ${
                    i % 2 === 0 ? "bg-white" : "bg-parchment/50"
                  } ${i < features.length - 1 ? "border-b border-border/50" : ""}`}>
                  <div className="p-4 text-sm text-navy/80 font-medium" style={{ fontFamily: "var(--font-body)" }}>
                    {feature.name}
                  </div>
                  <div className="p-4 text-center bg-maple/5">
                    <CellValue value={feature.us} />
                  </div>
                  <div className="p-4 text-center">
                    <CellValue value={feature.comp1} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-muted-foreground mt-4"
          style={{ fontFamily: "var(--font-body)" }}>
          Comparison based on publicly available information as of 2026. Features may vary.
        </motion.p>
      </div>
    </section>
  );
}
