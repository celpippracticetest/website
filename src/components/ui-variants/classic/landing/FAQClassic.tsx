"use client";

import React, { useState } from "react";
import SvgChevronDown from "@/components/icons/ChevronDown";
import { useEngagementTracking } from "@/hooks/useTracking";

const FAQClassic = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { faqClick } = useEngagementTracking();

  const toggleAccordion = (index: number, question: string) => {
    if (openIndex !== index) {
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
        "Our practice tests follow the public CELPIP format and timing closely, but they are independent preparation materials and are not official CELPIP exams. AI scoring is useful for practice and progress tracking, not a guaranteed official score.",
    },
    {
      question: "Will I get instant online CELPIP scores and feedback?",
      answer:
        "Yes. Writing and Speaking answers receive instant AI feedback and scoring. Listening and Reading receive auto-scored, complete answer keys.",
    },
    {
      question: "What are the best 4 skills on the CELPIP practice platform?",
      answer:
        "The strongest areas are full CELPIP mock tests, AI-scored Writing practice, AI-assisted Speaking feedback, and skill drills for Listening and Reading. Learners use these together to build timing, structure, vocabulary, and confidence.",
    },
    {
      question: "Do your CELPIP mock tests simulate real exam settings?",
      answer:
        "Yes. Our mocks are timed and structured similarly to the CELPIP test so you can practice pacing, focus, and section-by-section strategy.",
    },
    {
      question: "What do you offer on CELPIPPracticeTest.com?",
      answer:
        "At <a href='/' style='color: inherit; text-decoration: underline;'>CELPIPPracticeTest.com</a>, we offer a complete set of preparation tools, including real practice tests, complete practice exams, skill-development activities, study guides, and an exclusive Learning area.",
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
      className="mx-auto mb-[80px] mt-[80px] max-w-[1440px] px-[20px] screen1280:!mt-[104px] screen1280:!px-[40px]"
    >
      <h2
        id="faq-heading"
        className="mb-[40px] text-center text-[24px] font-medium text-text1 screen744:!text-[32px]"
      >
        FAQs
      </h2>

      <div className="flex flex-col gap-[16px]">
        {faqs.map((faq, index) => (
          <div
            key={faq.question}
            className="overflow-hidden rounded-[16px] border border-[#E0E0E0] bg-[#F8F9FC]"
          >
            <button
              type="button"
              onClick={() => toggleAccordion(index, faq.question)}
              className="flex w-full items-center justify-between bg-[#F8F9FC] p-[24px] text-left transition-colors hover:bg-[#F1F3F9]"
              aria-expanded={openIndex === index}
            >
              <span className="pr-[16px] text-[16px] font-medium text-text1 screen744:!text-[18px]">
                {faq.question}
              </span>
              <span
                className={`min-w-[20px] transform transition-transform duration-300 ${
                  openIndex === index ? "rotate-180" : ""
                }`}
              >
                <SvgChevronDown />
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                openIndex === index
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div
                  className="p-[24px] pt-0 text-[16px] leading-[24px] text-[#5F6D7E]"
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

export default FAQClassic;
