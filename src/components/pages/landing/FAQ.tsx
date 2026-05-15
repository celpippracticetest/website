import React, { useState } from "react";
import Link from "next/link";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SvgChevronDown from "../../icons/ChevronDown";
import { useEngagementTracking } from "@/hooks/useTracking";

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const { faqClick } = useEngagementTracking();

    const toggleAccordion = (index: number, question: string) => {
        if (openIndex !== index) {
            // Track FAQ click when opening
            faqClick(question, "Landing Page");
        }
        setOpenIndex(openIndex === index ? null : index);
    };

    const faqs = [
        {
            question: "Can I try the platform before I pay?",
            answer:
                "Yes. Create a free account to explore practice across Listening, Reading, Writing, and Speaking. When you are ready for the full mock library, the complete question bank, and unlimited AI feedback, you can upgrade to Plus from <a href='/pricing' style='color: inherit; text-decoration: underline;'>Pricing</a>—no credit card is required to get started.",
        },
        {
            question: "Do you offer native mobile apps?",
            answer:
                "Yes. Practice on the go with our iOS and Android apps. Download links and details are on the <a href='/app' style='color: inherit; text-decoration: underline;'>mobile app</a> page; your progress stays in sync with the web experience when you use the same account.",
        },
        {
            question: "What CLB score do I need for Canadian immigration?",
            answer:
                "Requirements depend on your program (Express Entry, PNPs, citizenship, etc.). Use our free <a href='/score-calculator' style='color: inherit; text-decoration: underline;'>CELPIP score calculator</a> to relate section scores to CLB-style levels, then confirm targets with your immigration pathway or consultant.",
        },
        {
            question: "What is your refund policy?",
            answer:
                "Refunds are limited to your <strong>first</strong> subscription purchase and must be requested within <strong>48 hours</strong> of payment, with usage caps (for example, at most one completed mock exam and limited practice activity per skill). Renewals and late requests are not eligible. Full terms are in our <a href='/refund-policy' style='color: inherit; text-decoration: underline;'>Refund Policy</a>; submit a request only through the <a href='/refund-request' style='color: inherit; text-decoration: underline;'>refund request</a> page so we can track it.",
        },
        {
            question: "What makes CELPIPPracticeTest.com different from other prep sites?",
            answer:
                "We focus on realistic, timed CELPIP-style practice, instant AI feedback on Writing and Speaking, detailed explanations on Listening and Reading, and a large bank of mocks and questions—so you can diagnose weaknesses quickly and study with a clear plan.",
        },
        {
            question: "Where can I try a CELPIP reading practice test for free?",
            answer:
                "Start with our <a href='/reading' style='color: inherit; text-decoration: underline;'>CELPIP reading practice</a> hub: timed passages and question types that mirror the real reading section, with scoring feedback on your attempts.",
        },
        {
            question: "Is there a CELPIP score calculator for my overall score?",
            answer:
                "Yes. Use the free <a href='/score-calculator' style='color: inherit; text-decoration: underline;'>CELPIP score calculator</a> to estimate your overall performance and see how section scores relate to CLB-style levels.",
        },
        {
            question:
                "Where can I find CELPIP Writing Task 2 samples with answers?",
            answer:
                "Our <a href='/wiki/celpip-writing-task-2-template' style='color: inherit; text-decoration: underline;'>CELPIP Writing Task 2 template guide</a> walks through survey responses with sample sentences, structure, and vocabulary. Pair it with timed <a href='/writing' style='color: inherit; text-decoration: underline;'>writing practice</a> for full responses and AI feedback.",
        },
        {
            question:
                "Where can one take a full CELPIP practice test free of charge online?",
            answer:
                "There are free CELPIP mock tests directly on CelpipPracticeTest.com.",
        },
        {
            question: "How exact are CELPIP practice tests compared to the real test?",
            answer:
                "Our simulations attempt to replicate the actual CELPIP test format and duration. With AI-based scoring, your scores reflect real exam performance, enabling you to better estimate your CLB levels.",
        },
        {
            question: "Will I get instant online CELPIP scores and feedback?",
            answer:
                "Yes. Writing and Speaking answers receive instant AI feedback and scoring. Listening and Reading receive auto-scored, complete answer keys.",
        },
        {
            question: "What are the best 4 skills on the CELPIP practice platform?",
            answer:
                "CelpipPracticeTest.com is Australia and Canada's go-to CELPIP practice platform, preferred by 20,000+ test-takers. Students love us for the largest collection of CELPIP-specific mocks and practice exercises.",
        },
        {
            question: "Do your CELPIP mock tests simulate real exam settings?",
            answer:
                "Yes. Our mocks are timed and structured similarly to the actual CELPIP test, getting under real exam conditions",
        },
        {
            question: "What do you offer on CELPIPPracticeTest.com?",
            answer:
                "At \u003ca href='/' style='color: inherit; text-decoration: underline;'\u003eCELPIPPracticeTest.com\u003c/a\u003e, we offer a complete set of preparation tools, including real practice tests, complete practice exams, skill-development activities, study guides, and an exclusive Learning area.",
        },
        {
            question: "Is CELPIP better than IELTS?",
            answer:
                "The more appropriate one is your selection depending on your need and preference but in Canada and Australia CELPIP is the most popular and widely accepted by the universities and governments.",
        },
    ];

    return (
        <section
            id="faq"
            aria-labelledby="faq-heading"
            className="border-t border-slate-200 bg-white py-14 screen744:py-20 scroll-mt-24"
        >
            <div className="mx-auto max-w-[720px] px-4 screen744:px-8">
                <div className="mb-10 text-center screen744:mb-12">
                    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        <HelpOutlineIcon sx={{ fontSize: 16 }} aria-hidden />
                        Common Questions
                    </span>
                    <h2
                        id="faq-heading"
                        className="text-balance text-3xl font-extrabold text-slate-900 screen744:text-4xl"
                    >
                        Frequently Asked Questions
                    </h2>
                    <p className="mt-2 text-base text-slate-600">
                        Everything you need to know before getting started.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`overflow-hidden rounded-xl border bg-white transition-shadow ${openIndex === index
                                ? "border-blue-200 shadow-[0_4px_12px_rgba(59,130,246,0.08)]"
                                : "border-slate-200"
                                }`}
                        >
                            <button
                                type="button"
                                onClick={() => toggleAccordion(index, faq.question)}
                                className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50/80"
                                aria-expanded={openIndex === index}
                            >
                                <span className="text-[15px] font-semibold leading-snug text-slate-900 screen744:text-[16px]">
                                    {faq.question}
                                </span>
                                <span
                                    className={`flex shrink-0 transform text-slate-500 transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""
                                        }`}
                                >
                                    <SvgChevronDown />
                                </span>
                            </button>
                            <div
                                className={`grid transition-all duration-300 ease-in-out ${openIndex === index
                                    ? "grid-rows-[1fr] opacity-100"
                                    : "grid-rows-[0fr] opacity-0"
                                    }`}
                            >
                                <div className="overflow-hidden">
                                    <div
                                        className="border-t border-slate-100 px-5 pb-5 pt-0 text-[15px] leading-relaxed text-slate-600"
                                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-10 text-center">
                    <p className="mb-4 text-base text-slate-600">Still have questions?</p>
                    <div className="flex flex-col items-stretch justify-center gap-3 screen744:flex-row screen744:justify-center">
                        <Link
                            href="/contact-us"
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
                        >
                            Contact Us
                        </Link>
                        <Link
                            href="/practice-overview"
                            className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#1B2B5A] to-[#2E4494] px-6 py-3 text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-lg"
                        >
                            Try It Free
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
