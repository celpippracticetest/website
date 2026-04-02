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
            aria-labelledby="faq-heading"
            className="mt-[80px] screen1280:!mt-[104px] mb-[80px] max-w-[1440px] mx-auto px-[16px] screen744:!px-[24px] screen1280:!px-[40px]"
        >
            <h2
                id="faq-heading"
                className="text-center text-[24px] screen744:!text-[28px] screen1280:!text-[32px] font-semibold text-text1 mb-[40px]"
            >
                Frequently Asked Questions
            </h2>

            <div className="flex flex-col gap-[12px] max-w-[900px] mx-auto">
                {faqs.map((faq, index) => (
                    <div
                        key={index}
                        className="border border-[#E0E0E0] rounded-[16px] overflow-hidden bg-white shadow-[0_1px_3px_rgba(33,46,66,0.05)] hover:shadow-[0_4px_12px_rgba(33,46,66,0.08)] transition-shadow duration-300"
                    >
                        <button
                            onClick={() => toggleAccordion(index, faq.question)}
                            className="w-full flex justify-between items-center p-[20px] screen744:!p-[24px] text-left bg-white hover:bg-[#F9FAFC] transition-colors duration-200"
                            aria-expanded={openIndex === index}
                        >
                            <span className="text-[15px] screen744:!text-[16px] screen1280:!text-[17px] font-semibold text-text1 pr-[16px] flex-1">
                                {faq.question}
                            </span>
                            <span
                                className={`transform transition-transform duration-300 min-w-[20px] flex-shrink-0 ${openIndex === index ? "rotate-180" : ""
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
                                    className="p-[20px] screen744:!p-[24px] pt-0 text-[14px] screen744:!text-[15px] screen1280:!text-[16px] text-text2 leading-[22px] screen1280:!leading-[24px]"
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
