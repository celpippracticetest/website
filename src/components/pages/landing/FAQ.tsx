import React, { useState } from "react";
import SvgChevronDown from "../../icons/ChevronDown";
import { useEngagementTracking } from "@/hooks/useTracking";

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const { faqClick } = useEngagementTracking();

    const toggleAccordion = (index: number, question: string) => {
        const isClosing = openIndex === index;
        if (!isClosing) {
            faqClick(question, "Landing Page");
        }
        setOpenIndex(isClosing ? null : index);
    };

    const faqs = [
        {
            question: "Can I try the platform before I pay?",
            answer:
                "Yes. Start with the <a href='/free-celpip-practice-test' style='color: inherit; text-decoration: underline;'>free CELPIP practice test</a> to explore Listening, Reading, Writing, and Speaking. When you are ready for the full mock library, complete question bank, and more AI feedback, you can upgrade from <a href='/pricing' style='color: inherit; text-decoration: underline;'>Pricing</a>.",
        },
        {
            question: "Do you offer native mobile apps?",
            answer:
                "Yes. Practice on the go with our iOS and Android apps. Download links and details are on the <a href='/app' style='color: inherit; text-decoration: underline;'>mobile app</a> page; your progress stays in sync with the web experience when you use the same account.",
        },
        {
            question: "What CLB score do I need for Canadian immigration?",
            answer:
                "Requirements depend on your program, including Express Entry, PNPs, and citizenship. Use our free <a href='/score-calculator' style='color: inherit; text-decoration: underline;'>CELPIP score calculator</a> to relate section scores to CLB-style levels, then confirm targets with your immigration pathway or consultant.",
        },
        {
            question: "What is your refund policy?",
            answer:
                "Refunds are limited to your first subscription purchase and must be requested within 48 hours of payment, with usage caps. Full terms are in our <a href='/refund-policy' style='color: inherit; text-decoration: underline;'>Refund Policy</a>; submit a request through the <a href='/refund-request' style='color: inherit; text-decoration: underline;'>refund request</a> page.",
        },
        {
            question: "What makes CELPIPPracticeTest.com different from other prep sites?",
            answer:
                "We focus on realistic, timed CELPIP-style practice, instant AI feedback on Writing and Speaking, detailed explanations on Listening and Reading, and sample answers that show how stronger responses are built.",
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
            question: "Where can I find CELPIP Writing Task 1 samples?",
            answer:
                "Use our <a href='/celpip-writing-task-1-samples' style='color: inherit; text-decoration: underline;'>CELPIP Writing Task 1 samples</a> page for email examples, structure guidance, and common mistakes to avoid.",
        },
        {
            question: "Where can I find CELPIP Writing Task 2 samples with answers?",
            answer:
                "Start with our <a href='/celpip-writing-task-2-samples' style='color: inherit; text-decoration: underline;'>CELPIP Writing Task 2 samples</a>. The page explains survey-response structure, sample wording, and what makes an answer stronger. Pair it with timed <a href='/writing' style='color: inherit; text-decoration: underline;'>writing practice</a> for AI feedback.",
        },
        {
            question: "Where can I find CELPIP speaking sample answers?",
            answer:
                "Use our <a href='/celpip-speaking-samples' style='color: inherit; text-decoration: underline;'>CELPIP speaking samples</a> page to review sample responses for common prompt types, then practice in the <a href='/speaking' style='color: inherit; text-decoration: underline;'>Speaking</a> hub.",
        },
        {
            question: "Where can I take a free CELPIP practice test online?",
            answer:
                "You can start with the <a href='/free-celpip-practice-test' style='color: inherit; text-decoration: underline;'>free CELPIP practice test</a> on CELPIPPracticeTest.com. It links to practice for Listening, Reading, Writing, and Speaking so you can try the format before choosing a paid plan.",
        },
        {
            question: "How close are CELPIP practice tests to the real test?",
            answer:
                "Our practice is designed to mirror CELPIP-style timing, sections, and question formats. It is independent exam-prep material, not the official CELPIP test, so use it for preparation and score awareness rather than as an official score report.",
        },
        {
            question: "Will I get instant online CELPIP scores and feedback?",
            answer:
                "Yes. Writing and Speaking answers receive instant AI feedback and scoring. Listening and Reading receive auto-scored answers and explanations.",
        },
        {
            question: "Which CELPIP skills can I practice?",
            answer:
                "You can practice all four CELPIP skills: <a href='/listening' style='color: inherit; text-decoration: underline;'>Listening</a>, <a href='/reading' style='color: inherit; text-decoration: underline;'>Reading</a>, <a href='/writing' style='color: inherit; text-decoration: underline;'>Writing</a>, and <a href='/speaking' style='color: inherit; text-decoration: underline;'>Speaking</a>.",
        },
        {
            question: "Do your CELPIP mock tests simulate real exam settings?",
            answer:
                "Yes. Mock exams are timed and organized to help you practice pacing, stamina, and section flow under exam-like conditions.",
        },
        {
            question: "What do you offer on CELPIPPracticeTest.com?",
            answer:
                "CELPIPPracticeTest.com offers online CELPIP practice tests, full mock exams, skill practice, AI feedback for Writing and Speaking, sample answers, study guides, vocabulary tools, and a Learning area.",
        },
        {
            question: "Is CELPIP better than IELTS?",
            answer:
                "Neither test is automatically better for everyone. CELPIP is fully computer-delivered and commonly used for Canadian immigration and citizenship pathways, while IELTS is accepted in many countries and contexts. Choose based on the program you are applying to, your test availability, and the format you prefer.",
        },
    ];

    return (
        <section
            id="faq"
            aria-labelledby="faq-heading"
            className="border-t border-slate-200/60 py-12 screen744:py-16 scroll-mt-24"
        >
            <div className="mx-auto max-w-[1120px] px-4 screen744:px-8">
                <h2
                    id="faq-heading"
                    className="mb-8 text-center text-2xl font-bold text-slate-900 screen744:mb-10 screen744:text-3xl"
                >
                    FAQ
                </h2>

                <div className="grid grid-cols-1 items-start gap-3 screen744:grid-cols-2 screen744:gap-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={faq.question}
                            className={`h-fit overflow-hidden rounded-lg border bg-white ${openIndex === index ? "border-slate-300" : "border-slate-200"}`}
                        >
                            <button
                                type="button"
                                onClick={() => toggleAccordion(index, faq.question)}
                                className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-slate-50/60"
                                aria-expanded={openIndex === index}
                            >
                                <span className="text-sm font-semibold leading-snug text-slate-900">
                                    {faq.question}
                                </span>
                                <span
                                    className={`mt-0.5 flex shrink-0 text-slate-400 transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""}`}
                                >
                                    <SvgChevronDown />
                                </span>
                            </button>
                            <div
                                className={`grid transition-all duration-200 ease-in-out ${openIndex === index
                                    ? "grid-rows-[1fr] opacity-100"
                                    : "grid-rows-[0fr] opacity-0"
                                    }`}
                            >
                                <div className="overflow-hidden">
                                    <div
                                        className="border-t border-slate-100 px-4 pb-4 text-sm leading-relaxed text-slate-600"
                                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
