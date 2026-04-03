"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Star, Quote } from "lucide-react";

const SUCCESS_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663468453012/Nvow3xsVp4swjjq4NHT4Qb/success-celebration-QenF8PrDVX7Ku7QxEVwfWw.webp";

const testimonials = [
  {
    name: "Priya M.",
    location: "Toronto, ON",
    score: "L:10 S:10 R:9 W:9",
    text: "I practiced with CELPIP Master for just 3 weeks and scored way above what I needed for Express Entry. The AI feedback on my writing was incredibly detailed — it felt like having a personal tutor.",
    rating: 5,
    avatar: "PM",
  },
  {
    name: "Wei Chen",
    location: "Vancouver, BC",
    score: "L:12 S:11 R:10 W:10",
    text: "The mock exams are almost identical to the real test. I walked into my CELPIP exam feeling like I'd already done it before. No surprises, no panic. Got my PR approved last month!",
    rating: 5,
    avatar: "WC",
  },
  {
    name: "Ahmed K.",
    location: "Calgary, AB",
    score: "L:9 S:9 R:8 W:9",
    text: "What sets this apart is the Speaking practice with AI scoring. I was terrified of the speaking section, but after two weeks of daily practice, I actually felt confident. The pronunciation feedback is spot on.",
    rating: 5,
    avatar: "AK",
  },
  {
    name: "Maria Santos",
    location: "Montreal, QC",
    score: "L:11 S:10 R:10 W:9",
    text: "I tried three other platforms before finding CELPIP Master. The difference is the quality of explanations — every wrong answer has a clear explanation of why it's wrong. That's how you actually learn.",
    rating: 5,
    avatar: "MS",
  },
  {
    name: "Oluwaseun A.",
    location: "London, ON",
    score: "L:12 S:12 R:10 W:10",
    text: "Subscribed for just one week and it was worth every penny. The timed mock exams helped me manage my pace perfectly. Got 12 in both Listening and Speaking!",
    rating: 5,
    avatar: "OA",
  },
  {
    name: "Deepak R.",
    location: "Brampton, ON",
    score: "L:10 S:9 R:9 W:8",
    text: "The personalized study plan saved me so much time. Instead of randomly practicing, I knew exactly what to focus on each day. Passed on my first attempt!",
    rating: 5,
    avatar: "DR",
  },
];

export default function PassportTestimonialsSection() {
  const { ref, inView } = useInView({ threshold: 0.1 });

  return (
    <section id="testimonials" ref={ref} className="py-16 lg:py-24 bg-parchment">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center mb-12 lg:mb-16">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy leading-tight mb-4">
              Real People, Real <span className="italic text-maple">Results</span>
            </h2>
            <p className="text-lg text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              Join thousands of successful test-takers who achieved their target CELPIP scores and are now living their
              Canadian dream.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="hidden lg:block">
            <img
              src={SUCCESS_IMG}
              alt="Successful CELPIP test takers celebrating"
              className="rounded-2xl shadow-lg w-full"
              loading="lazy"
            />
          </motion.div>
        </div>

        <div className="flex lg:grid lg:grid-cols-3 gap-5 overflow-x-auto pb-4 lg:pb-0 snap-x snap-mandatory -mx-4 px-4 lg:mx-0 lg:px-0">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 15 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="min-w-[280px] sm:min-w-[300px] lg:min-w-0 snap-start bg-white rounded-xl p-5 sm:p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <Quote className="w-8 h-8 text-maple/20 mb-3" />

              <p className="text-navy/80 leading-relaxed mb-4 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-50 border border-green-200 mb-4">
                <span className="text-xs font-semibold text-green-700" style={{ fontFamily: "var(--font-body)" }}>
                  {t.score}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-white text-sm font-bold">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-navy text-sm" style={{ fontFamily: "var(--font-body)" }}>
                    {t.name}
                  </div>
                  <div className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    {t.location}
                  </div>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-secondary2 text-secondary2" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
