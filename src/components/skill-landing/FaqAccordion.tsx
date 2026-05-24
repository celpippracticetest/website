"use client";

import { useState } from "react";

function FaqChevron({ open }: { open: boolean }) {
  return (
    <svg
      className="text-[#76808F] w-5 h-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
      />
    </svg>
  );
}

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  faqs: FaqItem[];
}

export default function FaqAccordion({ faqs }: FaqAccordionProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-[#D5D6D8] overflow-hidden"
        >
          <button
            onClick={() => toggleFaq(index)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-[#212E42] font-medium">{faq.question}</span>
            <FaqChevron open={openFaqIndex === index} />
          </button>
          {openFaqIndex === index && (
            <div className="px-6 pb-4 text-[#525D6F] text-sm">{faq.answer}</div>
          )}
        </div>
      ))}
    </div>
  );
}
