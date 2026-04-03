"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is CELPIP and who needs it?",
    answer:
      "CELPIP (Canadian English Language Proficiency Index Program) is an official English-language test accepted by IRCC for Canadian permanent residency (Express Entry, PNP), citizenship, and professional designation. If you're applying for Canadian immigration, you likely need a CELPIP or IELTS score.",
  },
  {
    question: "How are your mock exams different from the real CELPIP?",
    answer:
      "Our mock exams are designed to mirror the real CELPIP as closely as possible — same question types, same timing, same interface layout. The key difference is that we provide instant AI-powered scoring and detailed feedback, which the official test does not offer. This means you learn from every practice attempt.",
  },
  {
    question: "How accurate is the AI scoring?",
    answer:
      "Our AI scoring system is trained on official CELPIP scoring criteria and has been validated against thousands of real test results. While no AI is perfect, our scores are consistently within 1 CLB level of actual test results. The real value is in the detailed feedback that shows you exactly how to improve.",
  },
  {
    question: "Can I practice just one module (like Speaking) without taking the full test?",
    answer:
      "Absolutely. You can practice any individual module — Listening, Reading, Writing, or Speaking — as standalone practice sessions. You can also take full-length mock exams when you're ready to simulate the complete test experience.",
  },
  {
    question: "Is there a free version I can try?",
    answer:
      "Yes! We offer a free trial that includes sample questions from all four modules and one complete mock exam. No credit card required. This lets you experience the platform before committing to a paid plan.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel anytime with no questions asked. We also offer a 7-day money-back guarantee on all plans. If you're not satisfied, we'll refund your payment in full.",
  },
  {
    question: "What CLB score do I need for Canadian immigration?",
    answer:
      "For Express Entry (Federal Skilled Worker), you typically need a minimum CLB 7 in all four skills. For Canadian citizenship, CLB 4 is the minimum. However, higher scores earn you more CRS points — a CLB 9+ in all skills can add up to 124 additional points to your Express Entry profile.",
  },
  {
    question: "Does the platform work on mobile devices?",
    answer:
      "Yes! Our platform is fully optimized for mobile devices. You can practice on your phone or tablet anywhere, anytime. The interface adapts to your screen size while maintaining the same quality experience as desktop.",
  },
];

export default function PassportFAQSection() {
  const { ref, inView } = useInView({ threshold: 0.1 });

  return (
    <section id="faq" ref={ref} className="py-16 lg:py-24 bg-white">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="text-center mb-10 lg:mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy leading-tight mb-4">
              Frequently Asked <span className="italic text-maple">Questions</span>
            </h2>
            <p className="text-lg text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              Everything you need to know about preparing for CELPIP with our platform.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${i}`}
                  className="bg-parchment rounded-xl border border-border px-5 lg:px-6 data-[state=open]:shadow-sm transition-shadow">
                  <AccordionTrigger
                    className="text-left text-navy font-semibold hover:text-maple py-5 text-base lg:text-lg [&[data-state=open]>svg]:text-maple"
                    style={{ fontFamily: "var(--font-body)" }}>
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent
                    className="text-muted-foreground leading-relaxed pb-5 text-sm lg:text-base"
                    style={{ fontFamily: "var(--font-body)" }}>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
