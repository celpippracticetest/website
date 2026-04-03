"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";

const HERO_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663468453012/Nvow3xsVp4swjjq4NHT4Qb/hero-bg-g9DwStDGBNv3J3K25xbmtK.webp";

export default function PassportCTASection() {
  const { ref, inView } = useInView({ threshold: 0.2 });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <section ref={ref} className="relative py-20 lg:py-28 overflow-hidden">
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary1/88 via-navy/90 to-[#121a2b]/95" />
      </div>

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Your Canadian Dream <span className="italic text-amber-light">Starts Here</span>
          </h2>
          <p
            className="text-lg text-white/70 mb-8 leading-relaxed"
            style={{ fontFamily: "var(--font-body)" }}>
            Join 50,000+ test-takers who trusted CELPIP Master to prepare for their exam. Sign up now and get instant
            access to a free full-length mock exam.
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">You&apos;re In!</h3>
              <p className="text-white/70" style={{ fontFamily: "var(--font-body)" }}>
                Thanks! Create your free account to start practicing:{" "}
                <strong className="text-white">{email}</strong>
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-navy placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-maple shadow-lg min-h-[52px]"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-maple hover:bg-maple-dark text-white font-semibold px-6 py-4 shadow-lg shadow-maple/30 whitespace-nowrap"
                  style={{ fontFamily: "var(--font-body)" }}>
                  Get Free Exam
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              {error ? (
                <p className="text-sm text-red-300 mt-2" style={{ fontFamily: "var(--font-body)" }}>
                  {error}
                </p>
              ) : null}
              <p className="text-xs text-white/50 mt-3" style={{ fontFamily: "var(--font-body)" }}>
                Free forever. No credit card required. Unsubscribe anytime.
              </p>
            </form>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10">
            {["Official CELPIP Format", "AI-Powered Scoring", "Cancel Anytime"].map((signal) => (
              <span
                key={signal}
                className="flex items-center gap-2 text-sm text-white/60"
                style={{ fontFamily: "var(--font-body)" }}>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                {signal}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
