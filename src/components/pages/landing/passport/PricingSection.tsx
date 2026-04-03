"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Gem } from "lucide-react";

const plans = [
  {
    name: "Weekly",
    icon: Zap,
    price: "14.99",
    period: "week",
    description: "Perfect for a quick start or last-minute prep before your test.",
    features: [
      "All 4 CELPIP modules",
      "5 full mock exams",
      "AI scoring for Writing & Speaking",
      "Basic progress tracking",
      "Mobile & desktop access",
    ],
    cta: "Start Weekly Plan",
    popular: false,
    color: "border-border",
  },
  {
    name: "Monthly",
    icon: Crown,
    price: "29.99",
    originalPrice: "59.99",
    period: "month",
    description: "Our most popular plan. Enough time to build real confidence.",
    features: [
      "All 4 CELPIP modules",
      "Unlimited mock exams (60+)",
      "Advanced AI feedback & coaching",
      "Personalized study plan",
      "Detailed score analytics",
      "Priority support",
    ],
    cta: "Start Monthly Plan",
    popular: true,
    color: "border-maple",
  },
  {
    name: "Quarterly",
    icon: Gem,
    price: "59.99",
    originalPrice: "179.99",
    period: "3 months",
    description: "Best value for serious preparation. Save 67% compared to weekly.",
    features: [
      "Everything in Monthly",
      "Unlimited mock exams (60+)",
      "1-on-1 AI tutor sessions",
      "Score guarantee program",
      "Exam day strategy guide",
      "Lifetime access to study guides",
    ],
    cta: "Start Quarterly Plan",
    popular: false,
    color: "border-navy",
  },
];

export default function PassportPricingSection() {
  const { ref, inView } = useInView({ threshold: 0.1 });

  return (
    <section id="pricing" ref={ref} className="py-16 lg:py-24 bg-white">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy leading-tight mb-4">
              Simple, Transparent <span className="italic text-maple">Pricing</span>
            </h2>
            <p className="text-lg text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              All plans in <strong>CAD</strong>. Start with a free trial — no credit card required. Cancel anytime, no
              questions asked.
            </p>
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-green-50 border border-green-200">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="text-sm font-medium text-green-700" style={{ fontFamily: "var(--font-body)" }}>
                127 people started a free trial today
              </span>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`relative bg-white rounded-2xl border-2 ${plan.color} p-6 lg:p-8 ${
                plan.popular ? "shadow-xl shadow-maple/10 md:scale-105" : "shadow-sm"
              } transition-shadow hover:shadow-lg`}>
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-maple text-white text-xs font-bold uppercase tracking-wider shadow-md whitespace-nowrap"
                    style={{ fontFamily: "var(--font-body)" }}>
                    <Crown className="w-3.5 h-3.5 shrink-0" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-parchment mb-3">
                  <plan.icon className="w-6 h-6 text-navy" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  {plan.description}
                </p>
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    CAD
                  </span>
                  <span className="text-4xl font-bold text-navy font-display">${plan.price}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                  per {plan.period}
                  {plan.originalPrice && (
                    <span className="ml-2 line-through text-muted-foreground/50">${plan.originalPrice}</span>
                  )}
                </div>
              </div>

              <Button
                className={`w-full mb-6 font-semibold py-5 ${
                  plan.popular
                    ? "bg-maple hover:bg-maple-dark text-white shadow-md"
                    : "bg-navy hover:bg-navy-light text-white"
                }`}
                style={{ fontFamily: "var(--font-body)" }}
                asChild>
                <Link href="/pricing">{plan.cta}</Link>
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-navy/80">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center mt-10">
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              2-day money-back guarantee · Cancel anytime · No hidden fees
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
