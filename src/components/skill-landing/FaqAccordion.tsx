"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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
            {openFaqIndex === index ? (
              <ChevronUp className="text-[#76808F] w-5 h-5 shrink-0" />
            ) : (
              <ChevronDown className="text-[#76808F] w-5 h-5 shrink-0" />
            )}
          </button>
          {openFaqIndex === index && (
            <div className="px-6 pb-4 text-[#525D6F] text-sm">{faq.answer}</div>
          )}
        </div>
      ))}
    </div>
  );
}
