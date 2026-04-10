import React, { useState } from "react";
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
            className="mt-[80px] screen1280:!mt-[104px] mb-[80px] max-w-[1440px] mx-auto px-[20px] screen1280:!px-[40px] scroll-mt-24"
        >
            <h2
                id="faq-heading"
                className="text-center text-[24px] screen744:!text-[32px] font-medium text-text1 mb-[40px]"
            >
                FAQs
            </h2>

            <div className="flex flex-col gap-[16px]">
                {faqs.map((faq, index) => (
                    <div
                        key={index}
                        className="border border-[#E0E0E0] rounded-[16px] overflow-hidden bg-[#F8F9FC]"
                    >
                        <button
                            onClick={() => toggleAccordion(index, faq.question)}
                            className="w-full flex justify-between items-center p-[24px] text-left bg-[#F8F9FC] hover:bg-[#F1F3F9] transition-colors"
                            aria-expanded={openIndex === index}
                        >
                            <span className="text-[16px] screen744:!text-[18px] font-medium text-text1 pr-[16px]">
                                {faq.question}
                            </span>
                            <span
                                className={`transform transition-transform duration-300 min-w-[20px] ${openIndex === index ? "rotate-180" : ""
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
                                    className="p-[24px] pt-0 text-[16px] text-[#5F6D7E] leading-[24px]"
                                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FAQ;
